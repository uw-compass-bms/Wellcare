import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth/middleware'
import { createTask, getTasksByUserId } from '@/lib/database/queries'

/**
 * GET /api/signature/tasks
 * 获取认证用户的所有签字任务
 */
export async function GET(request: NextRequest) {
  try {
    // 验证用户认证
    const authResult = await validateAuth()
    if (!authResult.success) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required'
      }, { status: 401 })
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'draft' | 'in_progress' | 'completed' | 'cancelled' | null

    // 查询用户的任务
    const result = await getTasksByUserId(authResult.userId!, status || undefined)

    if (!result.success) {
      return NextResponse.json({
        error: 'Database error',
        message: 'Failed to fetch tasks'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('GET /api/signature/tasks error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/signature/tasks  
 * 创建新的签字任务
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户认证
    const authResult = await validateAuth()
    if (!authResult.success) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required'
      }, { status: 401 })
    }

    // 解析请求体
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json({
        error: 'Invalid request',
        message: 'Request body must be valid JSON'
      }, { status: 400 })
    }

    // 验证必需字段
    const { title, description } = body
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({
        error: 'Validation error',
        message: 'Title is required and must be a non-empty string'
      }, { status: 400 })
    }

    if (title.length > 200) {
      return NextResponse.json({
        error: 'Validation error',
        message: 'Title must be 200 characters or less'
      }, { status: 400 })
    }

    if (description && typeof description !== 'string') {
      return NextResponse.json({
        error: 'Validation error',
        message: 'Description must be a string'
      }, { status: 400 })
    }

    // 创建任务
    const result = await createTask(
      authResult.userId!,
      title.trim(),
      description?.trim() || undefined
    )

    if (!result.success) {
      return NextResponse.json({
        error: 'Database error',
        message: 'Failed to create task'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Task created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('POST /api/signature/tasks error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 