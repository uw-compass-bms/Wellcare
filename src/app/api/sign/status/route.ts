import { NextRequest, NextResponse } from 'next/server'
import { validateRecipientToken } from '@/lib/auth/token-validator'
import { supabase } from '@/lib/supabase/client'

/**
 * GET /api/sign/status?token=xxx
 * 查询签字进度和状态信息
 * 
 * 功能：
 * 1. 验证收件人token有效性
 * 2. 获取当前收件人的签字进度
 * 3. 聚合任务整体进度状态
 * 4. 提供详细的状态追踪信息
 * 
 * 响应数据：
 * - 个人签字进度（当前收件人）
 * - 任务整体进度（所有收件人）
 * - 详细状态信息和时间线
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 获取并验证token参数
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Token参数缺失',
          details: '请提供有效的token参数'
        },
        { status: 400 }
      )
    }

    console.log('状态查询请求:', {
      token: token.substring(0, 10) + '...',
      timestamp: new Date().toISOString()
    })

    // 2. 验证token有效性
    const tokenValidation = await validateRecipientToken(token)
    
    if (!tokenValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          expired: tokenValidation.expired || false,
          error: tokenValidation.error || 'Token验证失败'
        },
        { status: tokenValidation.expired ? 410 : 401 }
      )
    }

    const recipient = tokenValidation.recipient!
    console.log('Token验证成功 - 收件人:', {
      recipient_id: recipient.id,
      name: recipient.name,
      status: recipient.status
    })

    // 3. 获取任务基础信息
    const { data: task, error: taskError } = await supabase
      .from('signature_tasks')
      .select('id, title, description, status, created_at, completed_at')
      .eq('id', recipient.taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { 
          success: false,
          error: '任务信息获取失败',
          details: taskError?.message || '未找到对应任务'
        },
        { status: 404 }
      )
    }

    // 4. 获取当前收件人的签字位置进度
    const { data: myPositions, error: myPositionsError } = await supabase
      .from('signature_positions')
      .select('id, file_id, page_number, status, placeholder_text, signature_content, signed_at, created_at')
      .eq('recipient_id', recipient.id)
      .order('created_at', { ascending: true })

    if (myPositionsError) {
      return NextResponse.json(
        { 
          success: false,
          error: '个人签字位置查询失败',
          details: myPositionsError.message
        },
        { status: 500 }
      )
    }

    // 5. 获取当前收件人的完整信息（包括signed_at）
    const { data: fullRecipient, error: fullRecipientError } = await supabase
      .from('signature_recipients')
      .select('id, name, email, status, signed_at, created_at')
      .eq('id', recipient.id)
      .single()

    if (fullRecipientError) {
      return NextResponse.json(
        { 
          success: false,
          error: '完整收件人信息查询失败',
          details: fullRecipientError.message
        },
        { status: 500 }
      )
    }

    // 6. 获取任务所有收件人信息（聚合统计用）
    const { data: allRecipients, error: allRecipientsError } = await supabase
      .from('signature_recipients')
      .select('id, name, email, status, signed_at, created_at')
      .eq('task_id', recipient.taskId)
      .order('created_at', { ascending: true })

    if (allRecipientsError) {
      return NextResponse.json(
        { 
          success: false,
          error: '收件人信息查询失败',
          details: allRecipientsError.message
        },
        { status: 500 }
      )
    }

    // 7. 获取任务所有签字位置（整体进度计算）
    const { data: allPositions, error: allPositionsError } = await supabase
      .from('signature_positions')
      .select('id, recipient_id, file_id, status, signed_at')
      .in('recipient_id', allRecipients.map(r => r.id))
      .order('created_at', { ascending: true })

    if (allPositionsError) {
      return NextResponse.json(
        { 
          success: false,
          error: '签字位置查询失败',
          details: allPositionsError.message
        },
        { status: 500 }
      )
    }

    // 8. 计算个人签字进度
    const myTotalPositions = myPositions.length
    const mySignedPositions = myPositions.filter(pos => pos.status === 'signed').length
    const myPendingPositions = myPositions.filter(pos => pos.status === 'pending').length
    const myCompletionPercentage = myTotalPositions > 0 ? Math.round((mySignedPositions / myTotalPositions) * 100) : 0
    const myIsAllSigned = myTotalPositions > 0 && mySignedPositions === myTotalPositions

    // 9. 计算任务整体进度
    const totalPositions = allPositions.length
    const totalSignedPositions = allPositions.filter(pos => pos.status === 'signed').length
    const totalPendingPositions = allPositions.filter(pos => pos.status === 'pending').length
    const overallCompletionPercentage = totalPositions > 0 ? Math.round((totalSignedPositions / totalPositions) * 100) : 0
    const overallIsCompleted = totalPositions > 0 && totalSignedPositions === totalPositions

    // 10. 统计收件人状态
    const totalRecipients = allRecipients.length
    const signedRecipients = allRecipients.filter(r => r.status === 'signed').length
    const pendingRecipients = allRecipients.filter(r => r.status === 'pending').length
    const recipientCompletionPercentage = totalRecipients > 0 ? Math.round((signedRecipients / totalRecipients) * 100) : 0

    // 11. 生成个人签字位置详情
    const myPositionDetails = myPositions.map(pos => ({
      id: pos.id,
      file_id: pos.file_id,
      page_number: pos.page_number,
      status: pos.status,
      placeholder_text: pos.placeholder_text || `${fullRecipient.name} - 点击签字`,
      signature_content: pos.signature_content,
      signed_at: pos.signed_at,
      is_completed: pos.status === 'signed',
      created_at: pos.created_at
    }))

    // 12. 生成时间线信息
    const timeline = []
    
    // 任务创建时间
    timeline.push({
      type: 'task_created',
      message: '任务创建',
      timestamp: task.created_at,
      details: `任务"${task.title}"已创建`
    })

    // 个人签字时间
    myPositions
      .filter(pos => pos.status === 'signed' && pos.signed_at)
      .forEach(pos => {
        timeline.push({
          type: 'position_signed',
          message: '完成签字',
          timestamp: pos.signed_at,
          details: `在文件第${pos.page_number}页完成签字`
        })
      })

    // 任务完成时间
    if (task.status === 'completed' && task.completed_at) {
      timeline.push({
        type: 'task_completed',
        message: '任务完成',
        timestamp: task.completed_at,
        details: '所有收件人已完成签字'
      })
    }

    // 按时间排序
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

        // 13. 构造完整响应
    const response = {
      success: true,
      valid: true,
      data: {
        // 个人状态信息
        personal: {
          recipient: {
            id: fullRecipient.id,
            name: fullRecipient.name,
            email: fullRecipient.email,
            status: fullRecipient.status,
            signed_at: fullRecipient.signed_at
          },
          progress: {
            total_positions: myTotalPositions,
            signed_positions: mySignedPositions,
            pending_positions: myPendingPositions,
            completion_percentage: myCompletionPercentage,
            is_all_signed: myIsAllSigned,
            status_summary: myIsAllSigned ? '已完成所有签字' : 
                          mySignedPositions > 0 ? `已签字 ${mySignedPositions}/${myTotalPositions}` : 
                          '尚未开始签字'
          },
          positions: myPositionDetails
        },

        // 任务整体状态
        task_overview: {
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            created_at: task.created_at,
            completed_at: task.completed_at
          },
          overall_progress: {
            total_recipients: totalRecipients,
            signed_recipients: signedRecipients,
            pending_recipients: pendingRecipients,
            recipient_completion_percentage: recipientCompletionPercentage,
            total_positions: totalPositions,
            signed_positions: totalSignedPositions,
            pending_positions: totalPendingPositions,
            position_completion_percentage: overallCompletionPercentage,
            is_completed: overallIsCompleted,
            task_status_summary: overallIsCompleted ? '任务已完成' : 
                               totalSignedPositions > 0 ? `进行中 (${overallCompletionPercentage}%)` : 
                               '等待签字'
          }
        },

        // 时间线追踪
        timeline: timeline,

        // 状态元信息
        metadata: {
          query_timestamp: new Date().toISOString(),
          next_actions: myIsAllSigned ? 
            ['等待其他收件人完成', '查看任务整体进度'] : 
            ['继续完成剩余签字位置', '查看签字界面'],
                     can_sign: fullRecipient.status === 'pending' && !myIsAllSigned,
          need_refresh: false
        }
      }
    }

    console.log('状态查询成功:', {
      recipient_id: fullRecipient.id,
      personal_progress: `${mySignedPositions}/${myTotalPositions}`,
      overall_progress: `${totalSignedPositions}/${totalPositions}`,
      task_status: task.status
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('签字状态查询错误:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
} 