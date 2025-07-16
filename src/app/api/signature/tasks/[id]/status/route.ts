import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth/middleware'
import { getTaskById, updateTask } from '@/lib/database/queries'
import { TaskStatusManager } from '@/lib/signature/status-manager'

/**
 * GET /api/signature/tasks/[id]/status
 * 获取任务状态信息和可用的状态转换
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const taskId = params.id

    // 验证taskId格式
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({
        error: 'Invalid request',
        message: 'Task ID is required'
      }, { status: 400 })
    }

    // 获取任务
    const result = await getTaskById(taskId, authResult.userId!)

    if (!result.success || !result.data) {
      return NextResponse.json({
        error: 'Not found',
        message: 'Task not found or access denied'
      }, { status: 404 })
    }

    const task = result.data
    const currentStatus = task.status as any

    // 获取状态转换信息
    const validTransitions = TaskStatusManager.getValidTransitions(currentStatus)
    const statusDescription = TaskStatusManager.getStatusDescription(currentStatus)

    // 获取每个可能转换的详细信息
    const transitionDetails = validTransitions.map(targetStatus => ({
      to: targetStatus,
      description: TaskStatusManager.getStatusDescription(targetStatus),
      transition_info: TaskStatusManager.getTransitionInfo(currentStatus, targetStatus)
    }))

    return NextResponse.json({
      success: true,
      data: {
        task_id: taskId,
        current_status: currentStatus,
        current_status_description: statusDescription,
        valid_transitions: validTransitions,
        transition_details: transitionDetails,
        timestamps: {
          created_at: task.created_at,
          updated_at: task.updated_at,
          sent_at: task.sent_at,
          completed_at: task.completed_at
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('GET /api/signature/tasks/[id]/status error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT /api/signature/tasks/[id]/status
 * 专门用于状态转换的端点，提供详细的转换验证和信息
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const taskId = params.id

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

    const { status, reason } = body

    // 验证status字段
    if (!status || typeof status !== 'string') {
      return NextResponse.json({
        error: 'Validation error',
        message: 'Status is required and must be a string'
      }, { status: 400 })
    }

    const validStatuses = ['draft', 'in_progress', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        error: 'Validation error',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      }, { status: 400 })
    }

    // 获取当前任务
    const currentTaskResult = await getTaskById(taskId, authResult.userId!)
    
    if (!currentTaskResult.success || !currentTaskResult.data) {
      return NextResponse.json({
        error: 'Not found',
        message: 'Task not found or access denied'
      }, { status: 404 })
    }

    const currentTask = currentTaskResult.data
    const currentStatus = currentTask.status as any

    // 执行状态转换验证和计算
    const transition = TaskStatusManager.executeStatusTransition(currentTask, status as any)

    if (!transition.valid) {
      return NextResponse.json({
        error: 'Status transition error',
        message: transition.error,
        current_status: currentStatus,
        current_status_description: TaskStatusManager.getStatusDescription(currentStatus),
        attempted_status: status,
        attempted_status_description: TaskStatusManager.getStatusDescription(status as any),
        valid_transitions: TaskStatusManager.getValidTransitions(currentStatus),
        reason: reason || null
      }, { status: 400 })
    }

    // 执行状态更新
    const updateResult = await updateTask(taskId, authResult.userId!, { status: status as any })

    if (!updateResult.success) {
      return NextResponse.json({
        error: 'Database error',
        message: 'Failed to update task status'
      }, { status: 500 })
    }

    // 获取转换信息
    const transitionInfo = TaskStatusManager.getTransitionInfo(currentStatus, status as any)

    return NextResponse.json({
      success: true,
      data: updateResult.data,
      transition: {
        from: currentStatus,
        from_description: TaskStatusManager.getStatusDescription(currentStatus),
        to: status,
        to_description: TaskStatusManager.getStatusDescription(status as any),
        timestamp: new Date().toISOString(),
        reason: reason || null,
        info: transitionInfo
      },
      message: `Task status updated: ${transitionInfo.description}`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('PUT /api/signature/tasks/[id]/status error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 