/**
 * Task 7.3: 邮件发送API
 * POST /api/signature/email/send
 * 
 * 功能：
 * - 批量发送签字邀请邮件
 * - 集成邮件模板系统
 * - 发送状态追踪和记录
 * - JWT认证和权限验证
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth/middleware'
import { getTaskById } from '@/lib/database/queries'
import { supabase } from '@/lib/supabase/client'
import { 
  sendEmail, 
  sendEmailWithRetry,
  type EmailSendOptions
} from '@/lib/email/resend-client'
import { 
  renderSignatureInviteTemplate,
  type SignatureInviteTemplateVars
} from '@/lib/email/templates'

// 邮件发送请求接口
interface EmailSendRequest {
  taskId: string                    // 任务ID
  recipientIds?: string[]           // 可选：指定收件人ID列表（空则发送给所有待发送收件人）
  customMessage?: string            // 可选：自定义消息
  companyName?: string              // 可选：公司名称
  expiryDays?: number              // 可选：过期天数（默认30天）
  testMode?: boolean               // 可选：测试模式（不更新数据库状态）
}

// 邮件发送结果
interface EmailSendResult {
  success: boolean
  recipientId: string
  recipientEmail: string
  messageId?: string
  error?: string
  skipped?: boolean
  skipReason?: string
}

// 批量发送结果
interface BatchSendResult {
  success: boolean
  taskId: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  skippedCount: number
  results: EmailSendResult[]
  summary: {
    sent: EmailSendResult[]
    failed: EmailSendResult[]
    skipped: EmailSendResult[]
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 1. 认证验证
    const authResult = await validateAuth()
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required'
      }, { status: 401 })
    }

    // 2. 解析请求体
    let requestBody: EmailSendRequest
    try {
      requestBody = await request.json()
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        message: 'Request body must be valid JSON'
      }, { status: 400 })
    }

    // 3. 验证必需参数
    const { taskId, recipientIds, customMessage, companyName, expiryDays = 30, testMode = false } = requestBody

    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid taskId',
        message: 'taskId is required and must be a valid string'
      }, { status: 400 })
    }

    if (recipientIds && !Array.isArray(recipientIds)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid recipientIds',
        message: 'recipientIds must be an array of strings'
      }, { status: 400 })
    }

    if (expiryDays && (typeof expiryDays !== 'number' || expiryDays < 1 || expiryDays > 365)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid expiryDays',
        message: 'expiryDays must be a number between 1 and 365'
      }, { status: 400 })
    }

    console.log('邮件发送请求:', {
      taskId,
      recipientIds: recipientIds?.length || 'all',
      expiryDays,
      testMode,
      userId: authResult.userId,
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

    // 5. 验证任务状态（只有draft和in_progress状态的任务可以发送邮件）
    if (!['draft', 'in_progress'].includes(task.status)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid task status',
        message: `Cannot send emails for task with status: ${task.status}`
      }, { status: 400 })
    }

    // 6. 查询目标收件人
    let recipientsQuery = supabase
      .from('signature_recipients')
      .select('id, name, email, status, token, token_expires_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    // 如果指定了收件人ID，只查询指定的收件人
    if (recipientIds && recipientIds.length > 0) {
      recipientsQuery = recipientsQuery.in('id', recipientIds)
    }

    const { data: recipients, error: recipientsError } = await recipientsQuery

    if (recipientsError) {
      console.error('查询收件人失败:', recipientsError)
      return NextResponse.json({
        success: false,
        error: 'Database error',
        message: 'Failed to fetch recipients'
      }, { status: 500 })
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No recipients found',
        message: 'No recipients found for this task'
      }, { status: 404 })
    }

    console.log(`找到 ${recipients.length} 个收件人`)

    // 7. 过滤可发送的收件人（只发送给pending状态的收件人）
    const sendableRecipients = recipients.filter(recipient => recipient.status === 'pending')
    const skippedRecipients = recipients.filter(recipient => recipient.status !== 'pending')

    console.log(`可发送收件人: ${sendableRecipients.length}, 跳过: ${skippedRecipients.length}`)

    // 8. 计算过期时间
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + expiryDays)
    const formattedExpiryDate = expiryDate.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    // 9. 准备批量发送
    const sendResults: EmailSendResult[] = []

    // 先添加跳过的收件人到结果中
    for (const recipient of skippedRecipients) {
      const skipReasons = {
        'signed': '收件人已完成签字',
        'cancelled': '收件人已取消',
        'expired': '收件人Token已过期'
      }

      sendResults.push({
        success: false,
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        skipped: true,
        skipReason: skipReasons[recipient.status as keyof typeof skipReasons] || `状态: ${recipient.status}`
      })
    }

    // 10. 发送邮件给可发送的收件人
    for (const recipient of sendableRecipients) {
      try {
        console.log(`准备发送邮件给: ${recipient.name} (${recipient.email})`)

        // 验证收件人是否有有效token
        if (!recipient.token) {
          sendResults.push({
            success: false,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            error: '收件人Token缺失，请重新生成Token'
          })
          continue
        }

        // 构建签字链接
        const signatureUrl = `${request.nextUrl.origin}/sign/${recipient.token}`

        // 准备模板变量
        const templateVars: SignatureInviteTemplateVars = {
          recipientName: recipient.name,
          senderName: companyName || 'UW Compass用户', // 使用公司名称或默认名称
          documentTitle: task.title,
          signatureUrl: signatureUrl,
          taskId: task.id,
          companyName: companyName,
          message: customMessage,
          expiryDate: formattedExpiryDate
        }

        // 渲染邮件模板
        const templateResult = renderSignatureInviteTemplate(templateVars)
        if (!templateResult.success || !templateResult.template) {
          sendResults.push({
            success: false,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            error: `模板渲染失败: ${templateResult.error}`
          })
          continue
        }

        const { template } = templateResult

        // 准备邮件发送选项
        // 注意：在开发模式下，Resend只能发送到注册的邮箱地址
        const isDevelopment = process.env.NODE_ENV !== 'production';
        const actualRecipientEmail = isDevelopment && recipient.email !== 'uw.compass.bms@gmail.com' 
          ? 'uw.compass.bms@gmail.com' // 开发模式下使用测试邮箱
          : recipient.email;
          
        if (isDevelopment && actualRecipientEmail !== recipient.email) {
          console.log(`[开发模式] 邮件将发送到测试邮箱 ${actualRecipientEmail} 而不是 ${recipient.email}`);
        }
        
        const emailOptions: EmailSendOptions = {
          to: actualRecipientEmail,
          subject: template.subject,
          html: template.html,
          text: template.text
        }

        // 发送邮件（使用重试机制）
        if (!testMode) {
          const emailResult = await sendEmailWithRetry(emailOptions, 3)
          if (emailResult.success && emailResult.messageId) {
            sendResults.push({
              success: true,
              recipientId: recipient.id,
              recipientEmail: recipient.email,
              messageId: emailResult.messageId
            })
            console.log(`邮件发送成功: ${recipient.email}, MessageID: ${emailResult.messageId}`)
          } else {
            sendResults.push({
              success: false,
              recipientId: recipient.id,
              recipientEmail: recipient.email,
              error: emailResult.error || '邮件发送失败'
            })
            console.error(`邮件发送失败: ${recipient.email}, 错误: ${emailResult.error}`)
          }
        } else {
          // 测试模式：模拟成功发送
          sendResults.push({
            success: true,
            recipientId: recipient.id,
            recipientEmail: recipient.email,
            messageId: `test_${Date.now()}_${recipient.id.substring(0, 8)}`
          })
          console.log(`测试模式: 模拟发送给 ${recipient.email}`)
        }

      } catch (error) {
        console.error(`发送邮件异常: ${recipient.email}`, error)
        sendResults.push({
          success: false,
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          error: `发送异常: ${error instanceof Error ? error.message : String(error)}`
        })
      }
    }

    // 11. 统计结果
    const sentResults = sendResults.filter(r => r.success && !r.skipped)
    const failedResults = sendResults.filter(r => !r.success && !r.skipped)
    const skippedResults = sendResults.filter(r => r.skipped)

    const batchResult: BatchSendResult = {
      success: failedResults.length === 0, // 只有没有失败的才算成功
      taskId: taskId,
      totalRecipients: recipients.length,
      sentCount: sentResults.length,
      failedCount: failedResults.length,
      skippedCount: skippedResults.length,
      results: sendResults,
      summary: {
        sent: sentResults,
        failed: failedResults,
        skipped: skippedResults
      }
    }

    // 12. 更新任务状态（如果有邮件发送成功且不是测试模式）
    if (!testMode && sentResults.length > 0 && task.status === 'draft') {
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
          console.log('任务状态已更新为 in_progress')
        }
      } catch (updateError) {
        console.error('更新任务状态异常:', updateError)
      }
    }

    const duration = Date.now() - startTime
    
    console.log('邮件发送完成:', {
      taskId,
      totalRecipients: recipients.length,
      sent: sentResults.length,
      failed: failedResults.length,
      skipped: skippedResults.length,
      duration: `${duration}ms`,
      testMode
    })

    return NextResponse.json({
      ...batchResult,
      duration: `${duration}ms`,
      testMode,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('邮件发送API错误:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 