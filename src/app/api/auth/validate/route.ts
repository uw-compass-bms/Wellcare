import { NextRequest, NextResponse } from 'next/server'
import { validateAuth, validateAuthFromHeader, getCurrentUser, hasPermission } from '@/lib/auth/middleware'

/**
 * POST /api/auth/validate
 * 验证当前用户的认证状态和权限
 */
export async function POST(request: NextRequest) {
  try {
    // 获取请求体（如果有的话）
    let requestBody = {}
    try {
      const body = await request.text()
      if (body) {
        requestBody = JSON.parse(body)
      }
    } catch (parseError) {
      // 忽略JSON解析错误，使用空对象
    }

    // 进行多种认证验证
    const authResult = await validateAuth()
    const authFromHeader = await validateAuthFromHeader(request)
    const currentUser = await getCurrentUser()
    
    // 检查基础权限
    const permissions = {
      read: await hasPermission('read'),
      write: await hasPermission('write'),
      createTask: await hasPermission('create_task'),
      manageFiles: await hasPermission('manage_files')
    }

    const response = {
      timestamp: new Date().toISOString(),
      validation: {
        standardAuth: authResult,
        headerAuth: authFromHeader,
        currentUser: currentUser
      },
      permissions: permissions,
      request: {
        method: request.method,
        hasAuthHeader: !!request.headers.get('authorization'),
        authHeaderType: request.headers.get('authorization')?.split(' ')[0] || null,
        userAgent: request.headers.get('user-agent'),
        requestBody: Object.keys(requestBody).length > 0 ? requestBody : null
      },
      session: {
        authenticated: authResult.success,
        userId: authResult.userId || null,
        sessionId: authResult.sessionId || null
      }
    }

    // 根据认证状态返回适当的HTTP状态码
    const httpStatus = authResult.success ? 200 : 401

    return NextResponse.json(response, { status: httpStatus })

  } catch (error) {
    return NextResponse.json({
      error: 'Validation endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * GET /api/auth/validate
 * 简化的认证状态检查（不需要请求体）
 */
export async function GET() {
  try {
    const authResult = await validateAuth()
    const currentUser = await getCurrentUser()

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      authenticated: authResult.success,
      userId: authResult.userId || null,
      sessionId: authResult.sessionId || null,
      error: authResult.error || null,
      user: currentUser
    }, { 
      status: authResult.success ? 200 : 401 
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Authentication check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 