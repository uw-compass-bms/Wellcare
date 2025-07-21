import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend-client';
import { renderSignatureInviteTemplate } from '@/lib/email/templates';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email') || 'wangdawei4419@gmail.com';
    
    // Prepare template variables
    const templateVars = {
      recipientName: 'Test User',
      senderName: 'UW Compass',
      documentTitle: 'Test Document',
      signatureUrl: `${request.nextUrl.origin}/sign/test-token`,
      taskId: 'test-task-id',
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
    };
    
    // Render template
    const templateResult = renderSignatureInviteTemplate(templateVars);
    if (!templateResult.success || !templateResult.template) {
      return NextResponse.json({
        success: false,
        error: 'Template rendering failed',
        details: templateResult.error
      }, { status: 500 });
    }
    
    // Send email directly
    const result = await sendEmail({
      to: email,
      subject: templateResult.template.subject,
      html: templateResult.template.html,
      text: templateResult.template.text
    });
    
    return NextResponse.json({
      success: result.success,
      result: result,
      recipient: email,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}