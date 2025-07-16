import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// 认证结果类型定义
export interface AuthResult {
  success: boolean
  userId?: string
  error?: string
  sessionId?: string
}

/**
 * 验证当前请求的认证状态
 * 用于API路由中验证用户是否已登录
 */
export async function validateAuth(): Promise<AuthResult> {
  try {
    const { userId, sessionId } = await auth()
    
    if (!userId) {
      return {
        success: false,
        error: 'Unauthorized - No valid session found'
      }
    }

    return {
      success: true,
      userId,
      sessionId: sessionId || undefined
    }
  } catch (error) {
    return {
      success: false,
      error: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * 从请求头中验证JWT token
 * 备用方法，如果标准认证失败可以尝试这个方法
 */
export async function validateAuthFromHeader(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid Authorization header'
      }
    }

    // Clerk会自动验证JWT token，所以我们使用标准的auth()函数
    const { userId, sessionId } = await auth()
    
    if (!userId) {
      return {
        success: false,
        error: 'Invalid or expired token'
      }
    }

    return {
      success: true,
      userId,
      sessionId: sessionId || undefined
    }
  } catch (error) {
    return {
      success: false,
      error: `Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * 检查用户是否有特定权限
 * 目前简化版本，只检查是否已认证
 * 未来可以扩展为基于角色的权限检查
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const authResult = await validateAuth()
  
  if (!authResult.success) {
    return false
  }

  // 目前所有已认证用户都有基础权限
  // 未来这里可以加入更复杂的权限逻辑
  const basicPermissions = ['read', 'write', 'create_task', 'manage_files']
  
  return basicPermissions.includes(permission)
}

/**
 * 获取当前用户的详细信息
 * 包含认证验证和用户数据获取
 */
export async function getCurrentUser() {
  const authResult = await validateAuth()
  
  if (!authResult.success) {
    return {
      authenticated: false,
      error: authResult.error
    }
  }

  return {
    authenticated: true,
    userId: authResult.userId,
    sessionId: authResult.sessionId
  }
}

/**
 * API路由认证装饰器函数
 * 用于保护API端点，确保只有认证用户可以访问
 */
export function withAuth<T extends any[]>(
  handler: (userId: string, ...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    const authResult = await validateAuth()
    
    if (!authResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          message: authResult.error
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // 调用实际的处理函数，传入userId作为第一个参数
    return handler(authResult.userId!, ...args)
  }
} 