import { NextRequest, NextResponse } from 'next/server'
import { validateRecipientToken, isValidTokenFormat } from '@/lib/auth/token-validator'

/**
 * Step 4.2.3: 公开Token验证API
 * GET /api/auth/verify-token?token=xxx
 * 
 * 用于公开签字页面验证token
 * 不需要JWT认证，因为是公开访问
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { 
          valid: false,
          error: '缺少token参数' 
        },
        { status: 400 }
      )
    }

    // 基础格式检查
    if (!isValidTokenFormat(token)) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Token格式无效' 
        },
        { status: 400 }
      )
    }

    // 验证token
    const validation = await validateRecipientToken(token)

    if (!validation.valid) {
      return NextResponse.json(
        { 
          valid: false,
          error: validation.error,
          expired: validation.expired 
        },
        { status: validation.expired ? 410 : 404 } // 410 = Gone (过期), 404 = Not Found
      )
    }

    // Token有效，返回收件人和任务信息
    return NextResponse.json({
      valid: true,
      recipient: {
        id: validation.recipient!.id,
        name: validation.recipient!.name,
        email: validation.recipient!.email,
        status: validation.recipient!.status
      },
      task: {
        id: validation.recipient!.taskId
      },
      message: '验证成功'
    })

  } catch (error) {
    console.error('Token验证API错误:', error)
    return NextResponse.json(
      { 
        valid: false,
        error: '系统错误',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 