import { NextResponse } from 'next/server'
import { validateAuth, withAuth } from '@/lib/auth/middleware'

/**
 * GET /api/test/protected
 * 演示受保护的API端点 - 使用validateAuth函数
 */
export async function GET() {
  const authResult = await validateAuth()
  
  if (!authResult.success) {
    return NextResponse.json({
      error: 'Authentication required',
      message: authResult.error,
      timestamp: new Date().toISOString()
    }, { status: 401 })
  }

  return NextResponse.json({
    message: 'Access granted! This is a protected endpoint.',
    user: {
      userId: authResult.userId,
      sessionId: authResult.sessionId
    },
    timestamp: new Date().toISOString(),
    protectionMethod: 'validateAuth function'
  })
}

/**
 * POST /api/test/protected
 * 演示受保护的API端点 - 使用withAuth装饰器
 */
export const POST = withAuth(async (userId: string) => {
  return NextResponse.json({
    message: 'POST request successful! User authenticated via withAuth decorator.',
    userId: userId,
    timestamp: new Date().toISOString(),
    protectionMethod: 'withAuth decorator',
    example: 'This shows how to protect API endpoints easily'
  })
}) 