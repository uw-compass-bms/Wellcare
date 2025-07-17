import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, checkResendHealth } from '@/lib/email/resend-client'

export async function GET(request: NextRequest) {
  try {
    // 检查 Resend 健康状态
    const health = await checkResendHealth()
    
    return NextResponse.json({
      success: true,
      health,
      env: {
        hasResendApiKey: !!process.env.RESEND_API_KEY,
        apiKeyLength: process.env.RESEND_API_KEY?.length || 0
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text } = await request.json()
    
    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: to, subject, and (html or text)'
      }, { status: 400 })
    }
    
    const result = await sendEmail({
      to,
      subject,
      html: html || `<p>${text}</p>`,
      text: text || subject
    })
    
    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      details: result.details
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}