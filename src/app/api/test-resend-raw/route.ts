import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY not found'
      });
    }
    
    const resend = new Resend(apiKey);
    
    // Test sending a simple email
    const result = await resend.emails.send({
      from: 'UW Compass <delivered@resend.dev>',
      to: 'uw.compass.bms@gmail.com', // 使用验证的测试邮箱
      subject: 'Test Email from UW Compass',
      html: '<h1>Test Email</h1><p>This is a test email from UW Compass.</p>',
      text: 'Test Email - This is a test email from UW Compass.'
    });
    
    return NextResponse.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}