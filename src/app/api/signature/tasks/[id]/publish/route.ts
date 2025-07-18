/**
 * Task 7.4: 任务发布功能
 * POST /api/signature/tasks/[id]/publish
 * 
 * 功能：
 * - 验证任务可发布状态
 * - 批量发送签字邀请邮件
 * - 自动更新任务状态
 * - 完整的发布流程管理
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth/middleware'
import { getTaskById } from '@/lib/database/queries'
import { supabase } from '@/lib/supabase/client'

// 任务发布请求接口
interface TaskPublishRequest {
  customMessage?: string        // 可选：自定义邮件消息
  companyName?: string          // 可选：公司名称
  expiryDays?: number          // 可选：过期天数（默认30天）
  dryRun?: boolean             // 可选：预发布模式（不实际发送邮件）
}

// 任务发布结果
interface TaskPublishResult {
  success: boolean
  taskId: string
  publishedAt: string
  emailSummary: {
    totalRecipients: number
    sentCount: number
    failedCount: number
    skippedCount: number
  }
  taskStatus: {
    previousStatus: string
    currentStatus: string
    statusUpdated: boolean
  }
  validation: {
    hasRecipients: boolean
    hasFiles: boolean
    validStatus: boolean
    readyToPublish: boolean
  }
  error?: string
  emailDetails?: any
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  
  try {
    // 1. 认证验证
    console.log('[Publish API] Starting authentication validation...')
    const authResult = await validateAuth()
    console.log('[Publish API] Auth result:', { success: authResult.success, userId: authResult.userId })
    
    if (!authResult.success) {
      console.error('[Publish API] Authentication failed:', authResult.error)
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required'
      }, { status: 401 })
    }

    const taskId = params.id

    // 2. 验证taskId格式
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid task ID',
        message: 'Task ID is required and must be a valid string'
      }, { status: 400 })
    }

    // 3. 解析请求体
    let requestBody: TaskPublishRequest = {}
    try {
      const bodyText = await request.text()
      if (bodyText.trim()) {
        requestBody = JSON.parse(bodyText)
      }
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        message: 'Request body must be valid JSON or empty'
      }, { status: 400 })
    }

    const { customMessage, companyName, expiryDays = 30, dryRun = false } = requestBody

    console.log('任务发布请求:', {
      taskId,
      userId: authResult.userId,
      expiryDays,
      dryRun,
      timestamp: new Date().toISOString()
    })

    // 4. 验证任务存在且属于用户
    const taskResult = await getTaskById(taskId, authResult.userId!)
    if (!taskResult.success || !taskResult.data) {
      return NextResponse.json({
        success: false,
        error: 'Task not found',
        message: 'Task not found or access denied'
      }, { status: 404 })
    }

    const task = taskResult.data
    const previousStatus = task.status

    console.log('获取任务信息:', {
      taskId: task.id,
      title: task.title,
      status: task.status,
      createdAt: task.created_at
    })

    // 5. 验证任务状态（只有draft状态的任务可以发布）
    if (task.status !== 'draft') {
      return NextResponse.json({
        success: false,
        error: 'Invalid task status',
        message: `Task cannot be published. Current status: ${task.status}. Only 'draft' tasks can be published.`,
        taskStatus: {
          previousStatus: task.status,
          currentStatus: task.status,
          statusUpdated: false
        }
      }, { status: 400 })
    }

    // 6. 验证任务是否准备好发布
    const validationResult = await validateTaskReadyForPublish(taskId)
    
    if (!validationResult.readyToPublish) {
      return NextResponse.json({
        success: false,
        error: 'Task not ready for publish',
        message: 'Task validation failed',
        validation: validationResult,
        taskStatus: {
          previousStatus: task.status,
          currentStatus: task.status,
          statusUpdated: false
        }
      }, { status: 400 })
    }

    console.log('任务验证通过:', validationResult)

    // 7. 调用邮件发送API
    let emailSummary = {
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0
    }
    let emailDetails = null

    try {
      console.log('[Publish API] Calling email send API with options:', {
        taskId,
        customMessage: !!customMessage,
        companyName: !!companyName,
        expiryDays,
        testMode: dryRun
      })
      
      const emailResponse = await callEmailSendAPI(taskId, {
        customMessage,
        companyName,
        expiryDays,
        testMode: dryRun
      }, request)
      
      console.log('[Publish API] Email API response received:', {
        success: emailResponse.success,
        totalRecipients: emailResponse.totalRecipients,
        sentCount: emailResponse.sentCount,
        error: emailResponse.error
      })

      if (emailResponse.success) {
        emailSummary = {
          totalRecipients: emailResponse.totalRecipients,
          sentCount: emailResponse.sentCount,
          failedCount: emailResponse.failedCount,
          skippedCount: emailResponse.skippedCount
        }
        emailDetails = emailResponse
        console.log('邮件发送成功:', emailSummary)
      } else {
        console.error('邮件发送失败:', emailResponse.error)
        return NextResponse.json({
          success: false,
          error: 'Email sending failed',
          message: emailResponse.error || 'Failed to send invitation emails',
          validation: validationResult,
          taskStatus: {
            previousStatus: task.status,
            currentStatus: task.status,
            statusUpdated: false
          }
        }, { status: 500 })
      }
    } catch (emailError) {
      console.error('邮件发送异常:', emailError)
      return NextResponse.json({
        success: false,
        error: 'Email sending error',
        message: `Email sending failed: ${emailError instanceof Error ? emailError.message : String(emailError)}`,
        validation: validationResult,
        taskStatus: {
          previousStatus: task.status,
          currentStatus: task.status,
          statusUpdated: false
        }
      }, { status: 500 })
    }

    // 8. 更新任务状态（如果邮件发送成功且不是预发布模式）
    let statusUpdated = false
    let currentStatus = task.status

    if (!dryRun && emailSummary.sentCount > 0) {
      try {
        const { error: updateError } = await supabase
          .from('signature_tasks')
          .update({ 
            status: 'in_progress',
            sent_at: new Date().toISOString()
          })
          .eq('id', taskId)

        if (updateError) {
          console.error('更新任务状态失败:', updateError)
        } else {
          statusUpdated = true
          currentStatus = 'in_progress'
          console.log('任务状态已更新为 in_progress')
        }
      } catch (updateError) {
        console.error('更新任务状态异常:', updateError)
      }
    }

    // 9. 准备返回结果
    const publishResult: TaskPublishResult = {
      success: true,
      taskId: taskId,
      publishedAt: new Date().toISOString(),
      emailSummary: emailSummary,
      taskStatus: {
        previousStatus: previousStatus,
        currentStatus: currentStatus,
        statusUpdated: statusUpdated
      },
      validation: validationResult,
      emailDetails: emailDetails
    }

    const duration = Date.now() - startTime

    console.log('任务发布完成:', {
      taskId,
      duration: `${duration}ms`,
      emailsSent: emailSummary.sentCount,
      statusUpdated,
      dryRun
    })

    return NextResponse.json({
      ...publishResult,
      duration: `${duration}ms`,
      dryRun,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('任务发布API错误:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// 验证任务是否准备好发布
async function validateTaskReadyForPublish(taskId: string) {
  const validation = {
    hasRecipients: false,
    hasFiles: false,
    validStatus: false,
    readyToPublish: false
  }

  try {
    // 检查是否有收件人
    const { data: recipients, error: recipientsError } = await supabase
      .from('signature_recipients')
      .select('id, status')
      .eq('task_id', taskId)

    if (!recipientsError && recipients && recipients.length > 0) {
      // 至少要有一个pending状态的收件人
      const pendingRecipients = recipients.filter(r => r.status === 'pending')
      validation.hasRecipients = pendingRecipients.length > 0
    }

    // 检查是否有文件
    const { data: files, error: filesError } = await supabase
      .from('signature_files')
      .select('id, status')
      .eq('task_id', taskId)

    if (!filesError && files && files.length > 0) {
      validation.hasFiles = true
    }

    // 验证任务状态
    const { data: task, error: taskError } = await supabase
      .from('signature_tasks')
      .select('status')
      .eq('id', taskId)
      .single()

    if (!taskError && task && task.status === 'draft') {
      validation.validStatus = true
    }

    // 综合判断
    validation.readyToPublish = validation.hasRecipients && validation.hasFiles && validation.validStatus

    return validation

  } catch (error) {
    console.error('任务验证异常:', error)
    return validation
  }
}

// 调用邮件发送API
async function callEmailSendAPI(
  taskId: string, 
  options: {
    customMessage?: string
    companyName?: string
    expiryDays?: number
    testMode?: boolean
  },
  originalRequest: NextRequest
) {
  console.log('[callEmailSendAPI] Starting email API call...')
  
  const emailRequestBody = {
    taskId: taskId,
    customMessage: options.customMessage,
    companyName: options.companyName,
    expiryDays: options.expiryDays || 30,
    testMode: options.testMode || false
  }

  // 构建内部API调用URL
  const baseUrl = originalRequest.nextUrl.origin
  const emailApiUrl = `${baseUrl}/api/signature/email/send`
  
  console.log('[callEmailSendAPI] Email API URL:', emailApiUrl)
  console.log('[callEmailSendAPI] Request body:', emailRequestBody)

  const authHeader = originalRequest.headers.get('authorization')
  console.log('[callEmailSendAPI] Auth header present:', !!authHeader)

  try {
    const response = await fetch(emailApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 传递原始请求的认证头
        'Authorization': authHeader || ''
      },
      body: JSON.stringify(emailRequestBody)
    })

    console.log('[callEmailSendAPI] Response status:', response.status)
    console.log('[callEmailSendAPI] Response ok:', response.ok)

    const responseText = await response.text()
    console.log('[callEmailSendAPI] Response text:', responseText)

    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('[callEmailSendAPI] Failed to parse response:', parseError)
      throw new Error(`Invalid JSON response: ${responseText}`)
    }

    if (!response.ok) {
      console.error('[callEmailSendAPI] Email API error response:', responseData)
      throw new Error(`Email API failed: ${responseData.error || responseData.message || `HTTP ${response.status}`}`)
    }

    return responseData
  } catch (error) {
    console.error('[callEmailSendAPI] Fetch error:', error)
    throw error
  }
} 