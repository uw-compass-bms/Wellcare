import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend-client';

export async function GET(request: NextRequest) {
  try {
    // 从查询参数获取测试邮箱
    const searchParams = request.nextUrl.searchParams;
    const testEmail = searchParams.get('email') || 'uw.compass.bms@gmail.com';
    
    const result = await sendEmail({
      to: testEmail,
      subject: 'UW Compass - Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Email Test Successful!</h1>
          <p>This is a test email from UW Compass signature system.</p>
          <p>If you received this email, it means the email configuration is working correctly.</p>
          <hr />
          <p style="color: #666; font-size: 12px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
      text: 'Email Test Successful! This is a test email from UW Compass signature system.'
    });

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Test email sent successfully!' : 'Failed to send test email',
      details: result,
      recipient: testEmail,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}