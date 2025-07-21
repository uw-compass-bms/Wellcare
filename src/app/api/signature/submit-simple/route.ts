import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/email/resend-client';
import { renderSignatureCompleteTemplate } from '@/lib/email/templates';

export async function POST(request: NextRequest) {
  try {
    const { token, fieldValues } = await request.json();

    if (!token || !fieldValues) {
      return NextResponse.json({
        success: false,
        error: 'Token and field values are required'
      }, { status: 400 });
    }

    // 1. Verify token and get recipient info
    const { data: recipient, error: recipientError } = await supabase
      .from('signature_recipients')
      .select(`
        id,
        task_id,
        name,
        email,
        status,
        expires_at,
        signature_tasks!inner(
          id,
          title,
          description,
          user_id
        )
      `)
      .eq('token', token)
      .single();

    if (recipientError || !recipient) {
      console.error('Recipient not found:', recipientError);
      return NextResponse.json({
        success: false,
        error: 'Invalid token'
      }, { status: 404 });
    }

    // 2. Check if already signed
    if (recipient.status === 'signed') {
      return NextResponse.json({
        success: false,
        error: 'Document already signed'
      }, { status: 400 });
    }

    // 3. Check if token is expired
    const now = new Date();
    const expiresAt = new Date(recipient.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({
        success: false,
        error: 'Token has expired'
      }, { status: 410 });
    }

    // 4. Update signature_positions with signed content
    for (const [fieldId, value] of Object.entries(fieldValues)) {
      const { error: updateError } = await supabase
        .from('signature_positions')
        .update({
          signature_content: value as string,
          status: 'signed',
          signed_at: new Date().toISOString()
        })
        .eq('id', fieldId)
        .eq('recipient_id', recipient.id);

      if (updateError) {
        console.error('Failed to update field:', fieldId, updateError);
      }
    }

    // 5. Update recipient status
    const { error: updateError } = await supabase
      .from('signature_recipients')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString()
      })
      .eq('id', recipient.id);

    if (updateError) {
      console.error('Failed to update recipient status:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update signature status'
      }, { status: 500 });
    }

    // 6. Check if all recipients have signed
    const { data: allRecipients, error: allRecipientsError } = await supabase
      .from('signature_recipients')
      .select('status')
      .eq('task_id', recipient.task_id);

    if (!allRecipientsError && allRecipients) {
      const allSigned = allRecipients.every(r => r.status === 'signed');
      
      if (allSigned) {
        // Update task status to completed
        await supabase
          .from('signature_tasks')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', recipient.task_id);
      }
    }

    // 7. Send confirmation email to signer
    try {
      const templateResult = renderSignatureCompleteTemplate({
        recipientName: recipient.name,
        documentTitle: recipient.signature_tasks.title,
        signedAt: new Date().toLocaleString('zh-CN')
      });

      if (templateResult.success && templateResult.template) {
        const isDevelopment = process.env.NODE_ENV === 'development';
        const actualRecipientEmail = isDevelopment ? 'uw.compass.bms@gmail.com' : recipient.email;

        await sendEmail({
          to: actualRecipientEmail,
          subject: templateResult.template.subject,
          html: templateResult.template.html,
          text: templateResult.template.text
        });
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Document signed successfully',
        recipientId: recipient.id,
        taskId: recipient.task_id,
        signedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Signature submission error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process signature'
    }, { status: 500 });
  }
}