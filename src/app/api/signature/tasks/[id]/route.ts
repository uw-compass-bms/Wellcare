import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth/middleware'
import { getTaskById, updateTask, deleteTask } from '@/lib/database/queries'
import { supabase } from '@/lib/supabase/client'

/**
 * GET /api/signature/tasks/[id]
 * 获取完整任务详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户认证
    const authResult = await validateAuth()
    if (!authResult.success) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required'
      }, { status: 401 })
    }

    const { id: taskId } = await params

    // 验证taskId格式
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({
        error: 'Invalid request',
        message: 'Task ID is required'
      }, { status: 400 })
    }

    // 获取任务（包含用户验证）
    const result = await getTaskById(taskId, authResult.userId!)

    if (!result.success) {
      if (result.error?.toString().includes('PGRST116')) {
        return NextResponse.json({
          error: 'Not found',
          message: 'Task not found or access denied'
        }, { status: 404 })
      }

      return NextResponse.json({
        error: 'Database error',
        message: 'Failed to fetch task'
      }, { status: 500 })
    }

    // 获取任务的文件列表
    const { data: files } = await supabase
      .from('signature_files')
      .select('*')
      .eq('task_id', taskId)
      .order('file_order', { ascending: true })

    return NextResponse.json({
      success: true,
      task: result.data,
      files: files || [],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('GET /api/signature/tasks/[id] error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT /api/signature/tasks/[id]
 * 更新任务信息
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户认证
    const authResult = await validateAuth()
    if (!authResult.success) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required'
      }, { status: 401 })
    }

    const { id: taskId } = await params

    // 验证taskId格式
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({
        error: 'Invalid request',
        message: 'Task ID is required'
      }, { status: 400 })
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

    // 验证更新字段
    const { title, description, status } = body
    const updates: any = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({
          error: 'Validation error',
          message: 'Title must be a non-empty string'
        }, { status: 400 })
      }

      if (title.length > 200) {
        return NextResponse.json({
          error: 'Validation error',
          message: 'Title must be 200 characters or less'
        }, { status: 400 })
      }

      updates.title = title.trim()
    }

    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        return NextResponse.json({
          error: 'Validation error',
          message: 'Description must be a string or null'
        }, { status: 400 })
      }

      updates.description = description?.trim() || null
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'in_progress', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({
          error: 'Validation error',
          message: `Status must be one of: ${validStatuses.join(', ')}`
        }, { status: 400 })
      }

      // 如果包含状态更新，我们需要先获取当前任务来验证状态转换
      if (status !== null) {
        const currentTaskResult = await getTaskById(taskId, authResult.userId!)
        
        if (!currentTaskResult.success || !currentTaskResult.data) {
          return NextResponse.json({
            error: 'Not found',
            message: 'Task not found or access denied'
          }, { status: 404 })
        }

        // 导入状态管理器来验证转换
        const { TaskStatusManager } = await import('@/lib/signature/status-manager')
        
        const validation = TaskStatusManager.validateStatusTransition(
          currentTaskResult.data.status as any,
          status as any
        )

        if (!validation.valid) {
          return NextResponse.json({
            error: 'Status transition error',
            message: validation.error,
            current_status: currentTaskResult.data.status,
            attempted_status: status,
            valid_transitions: TaskStatusManager.getValidTransitions(currentTaskResult.data.status as any)
          }, { status: 400 })
        }
      }

      updates.status = status
    }

    // 检查是否有可更新的字段
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        error: 'Validation error',
        message: 'At least one field (title, description, status) must be provided'
      }, { status: 400 })
    }

    // 更新任务
    const result = await updateTask(taskId, authResult.userId!, updates)

    if (!result.success) {
      if (result.error?.toString().includes('PGRST116')) {
        return NextResponse.json({
          error: 'Not found',
          message: 'Task not found or access denied'
        }, { status: 404 })
      }

      return NextResponse.json({
        error: 'Database error',
        message: 'Failed to update task'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Task updated successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('PUT /api/signature/tasks/[id] error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/signature/tasks/[id]
 * 删除任务
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户认证
    const authResult = await validateAuth()
    if (!authResult.success) {
      return NextResponse.json({
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required'
      }, { status: 401 })
    }

    const { id: taskId } = await params

    // 验证taskId格式
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({
        error: 'Invalid request',
        message: 'Task ID is required'
      }, { status: 400 })
    }

    // 删除任务
    const result = await deleteTask(taskId, authResult.userId!)

    if (!result.success) {
      return NextResponse.json({
        error: 'Database error',
        message: 'Failed to delete task or task not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('DELETE /api/signature/tasks/[id] error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 