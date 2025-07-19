import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { sendEmail } from '@/lib/email/resend-client';
import { sendFinalPDFEmails } from '@/lib/email/send-final-pdf';

/**
 * 完成签名API
 * POST /api/public/sign/[token]/complete
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // 1. 验证token并获取收件人信息
    const { data: recipient, error: recipientError } = await supabase
      .from('signature_recipients')
      .select(`
        *,
        signature_tasks!inner(
          id,
          title,
          user_id
        )
      `)
      .eq('token', token)
      .single();

    if (recipientError || !recipient) {
      return NextResponse.json({
        success: false,
        error: 'Invalid token'
      }, { status: 404 });
    }

    // 2. 检查是否已经签名
    if (recipient.status === 'signed') {
      return NextResponse.json({
        success: false,
        error: 'Already signed'
      }, { status: 400 });
    }

    // 3. 检查所有签字位置是否都已完成
    const { data: pendingPositions } = await supabase
      .from('signature_positions')
      .select('id')
      .eq('recipient_id', recipient.id)
      .eq('status', 'pending');

    if (pendingPositions && pendingPositions.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Not all positions are signed',
        pendingCount: pendingPositions.length
      }, { status: 400 });
    }

    // 4. 更新收件人状态
    const { error: updateError } = await supabase
      .from('signature_recipients')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString()
      })
      .eq('id', recipient.id);

    if (updateError) {
      throw new Error('Failed to update recipient status');
    }

    // 5. 检查任务是否完成（所有收件人都已签名）
    const { data: pendingRecipients } = await supabase
      .from('signature_recipients')
      .select('id')
      .eq('task_id', recipient.task_id)
      .neq('status', 'signed');

    if (!pendingRecipients || pendingRecipients.length === 0) {
      // 更新任务状态为已完成
      await supabase
        .from('signature_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', recipient.task_id);

      // 触发PDF生成
      try {
        console.log('All recipients signed. Triggering PDF generation for task:', recipient.task_id);
        
        // 获取任务创建者的user_id
        const { data: taskData } = await supabase
          .from('signature_tasks')
          .select('user_id')
          .eq('id', recipient.task_id)
          .single();

        if (taskData?.user_id) {
          // 调用内部API生成PDF（使用服务端调用，无需认证）
          const generatePdfResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/signature/tasks/${recipient.task_id}/generate-final-pdf`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': taskData.user_id // 传递用户ID用于内部验证
            }
          });

          if (generatePdfResponse.ok) {
            const pdfResult = await generatePdfResponse.json();
            console.log('PDF generation successful:', pdfResult);
            
            // 发送包含最终PDF的邮件给所有收件人
            if (pdfResult.data?.files && pdfResult.data.files.length > 0) {
              await sendFinalPDFEmails({
                taskId: recipient.task_id,
                taskTitle: recipient.signature_tasks.title,
                files: pdfResult.data.files.map((f: any) => ({
                  fileName: f.fileName,
                  downloadUrl: f.downloadUrl
                }))
              });
            }
          } else {
            console.error('PDF generation failed:', await generatePdfResponse.text());
          }
        }
      } catch (pdfError) {
        console.error('Error triggering PDF generation:', pdfError);
        // 不要因为PDF生成失败而阻止签名完成
      }
    }

    // 6. 发送确认邮件给签署人
    try {
      await sendEmail({
        to: recipient.email,
        subject: `Signature Confirmation - ${recipient.signature_tasks.title}`,
        html: `
          <h2>Thank you for signing!</h2>
          <p>Dear ${recipient.name},</p>
          <p>This email confirms that you have successfully signed the document: <strong>${recipient.signature_tasks.title}</strong></p>
          <p>Date signed: ${new Date().toLocaleString()}</p>
          <p>You will receive a copy of the fully signed document once all parties have completed their signatures.</p>
          <br>
          <p>Best regards,<br>UW Compass Team</p>
        `,
        text: `Thank you for signing ${recipient.signature_tasks.title}. Date signed: ${new Date().toLocaleString()}`
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // 不要因为邮件失败而阻止签名完成
    }

    return NextResponse.json({
      success: true,
      message: 'Signature completed successfully',
      taskCompleted: !pendingRecipients || pendingRecipients.length === 0
    });

  } catch (error) {
    console.error('Error completing signature:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error'
    }, { status: 500 });
  }
}