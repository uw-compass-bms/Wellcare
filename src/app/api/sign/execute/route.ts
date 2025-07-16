import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

/**
 * POST /api/sign/execute
 * 执行一键签字操作
 * 
 * 核心功能：
 * 1. 验证收件人token
 * 2. 验证签字位置权限
 * 3. 执行签字操作（更新position状态）
 * 4. 数据库触发器自动处理级联状态更新
 * 
 * 请求体格式：
 * {
 *   "token": "s_abc123_456789",
 *   "position_id": "uuid"
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 1. 解析请求体
    let requestBody: any
    try {
      requestBody = await request.json()
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: '请求体格式错误',
          details: 'JSON解析失败'
        },
        { status: 400 }
      )
    }

    // 2. 验证必需参数
    const { token, position_id } = requestBody
    
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Token参数无效',
          details: 'Token必须是有效的字符串'
        },
        { status: 400 }
      )
    }

    if (!position_id || typeof position_id !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Position ID参数无效',
          details: 'position_id必须是有效的UUID字符串'
        },
        { status: 400 }
      )
    }

    // 3. 基础参数验证通过，记录日志
    console.log('签字执行请求:', {
      token: token.substring(0, 10) + '...',
      position_id,
      timestamp: new Date().toISOString()
    })

    // 4. Token验证 - 使用数据库函数验证token有效性
    console.log('开始验证token:', token.substring(0, 10) + '...')
    
    const { data: isTokenValid, error: tokenError } = await supabase
      .rpc('verify_recipient_token', { token_input: token })

    if (tokenError) {
      console.error('Token验证数据库错误:', tokenError)
      return NextResponse.json(
        {
          success: false,
          error: 'Token验证失败',
          details: `数据库错误: ${tokenError.message}`
        },
        { status: 500 }
      )
    }

    if (!isTokenValid) {
      console.log('Token验证失败:', token.substring(0, 10) + '...')
      return NextResponse.json(
        {
          success: false,
          error: 'Token无效或已过期',
          details: 'Token不存在或已超过有效期'
        },
        { status: 401 }
      )
    }

    console.log('Token验证成功:', token.substring(0, 10) + '...')

    // 5. 获取Token对应的收件人信息
    const { data: recipient, error: recipientError } = await supabase
      .from('signature_recipients')
      .select('id, name, email, task_id, status')
      .eq('token', token)
      .single()

    if (recipientError || !recipient) {
      console.error('获取收件人信息失败:', recipientError)
      return NextResponse.json(
        {
          success: false,
          error: '收件人信息获取失败',
          details: recipientError?.message || '未找到对应的收件人'
        },
        { status: 404 }
      )
    }

    // 6. 检查收件人状态
    if (recipient.status === 'signed') {
      return NextResponse.json(
        {
          success: false,
          error: '收件人已完成签字',
          details: '该收件人的所有签字位置都已完成'
        },
        { status: 410 }
      )
    }

    console.log('收件人信息验证成功:', {
      recipient_id: recipient.id,
      name: recipient.name,
      status: recipient.status
    })

    // 7. Position权限验证 - 检查position是否属于该收件人
    console.log('开始验证Position权限:', {
      position_id,
      recipient_id: recipient.id
    })

    const { data: position, error: positionError } = await supabase
      .from('signature_positions')
      .select('id, recipient_id, file_id, page_number, status, placeholder_text, signature_content, signed_at')
      .eq('id', position_id)
      .single()

    if (positionError || !position) {
      console.error('Position查询失败:', positionError)
      return NextResponse.json(
        {
          success: false,
          error: 'Position不存在',
          details: positionError?.message || '未找到指定的签字位置'
        },
        { status: 404 }
      )
    }

    // 8. 验证Position是否属于当前收件人
    if (position.recipient_id !== recipient.id) {
      console.error('Position权限验证失败:', {
        position_recipient_id: position.recipient_id,
        token_recipient_id: recipient.id
      })
      return NextResponse.json(
        {
          success: false,
          error: '无权访问该签字位置',
          details: '该签字位置不属于当前收件人'
        },
        { status: 403 }
      )
    }

    console.log('Position权限验证成功:', {
      position_id: position.id,
      status: position.status,
      file_id: position.file_id
    })

    // 9. Position状态检查 - 验证是否可以签字
    if (position.status === 'signed') {
      console.log('Position已签字:', {
        position_id: position.id,
        signed_at: position.signed_at,
        signature_content: position.signature_content
      })
      
      return NextResponse.json(
        {
          success: false,
          error: '该位置已签字',
          details: '该签字位置已完成，无法重复签字',
          data: {
            position_id: position.id,
            signed_at: position.signed_at,
            signature_content: position.signature_content
          }
        },
        { status: 410 }
      )
    }

    if (position.status !== 'pending') {
      console.error('Position状态异常:', {
        position_id: position.id,
        current_status: position.status,
        expected_status: 'pending'
      })
      
      return NextResponse.json(
        {
          success: false,
          error: '签字位置状态异常',
          details: `当前状态为 ${position.status}，无法签字`
        },
        { status: 400 }
      )
    }

    console.log('Position状态检查通过:', {
      position_id: position.id,
      status: position.status,
      ready_for_signing: true
    })

    // 10. 执行核心签字操作 - 更新Position状态（触发器自动处理其余逻辑）
    console.log('开始执行签字操作:', {
      position_id: position.id,
      recipient_name: recipient.name,
      action: 'update_status_to_signed'
    })

    // 生成签字内容（补偿数据库触发器缺失的逻辑）
    const signatureContent = `【${recipient.name}】signed at【${new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).replace('T', ' ')}】`
    const signedAt = new Date().toISOString()

    const { data: updatedPosition, error: updateError } = await supabase
      .from('signature_positions')
      .update({ 
        status: 'signed',
        signature_content: signatureContent,
        signed_at: signedAt
      })
      .eq('id', position.id)
      .select('id, status, signature_content, signed_at')
      .single()

    if (updateError) {
      console.error('签字操作失败:', updateError)
      return NextResponse.json(
        {
          success: false,
          error: '签字操作失败',
          details: `数据库更新错误: ${updateError.message}`
        },
        { status: 500 }
      )
    }

    if (!updatedPosition) {
      console.error('签字更新后未返回数据')
      return NextResponse.json(
        {
          success: false,
          error: '签字操作异常',
          details: '更新操作未返回预期数据'
        },
        { status: 500 }
      )
    }

    console.log('签字操作成功完成:', {
      position_id: updatedPosition.id,
      status: updatedPosition.status,
      signature_content: updatedPosition.signature_content,
      signed_at: updatedPosition.signed_at
    })

    // 11. 获取更新后的收件人和任务状态（由数据库触发器自动更新）
    const { data: updatedRecipient } = await supabase
      .from('signature_recipients')
      .select('id, name, status, signed_at, task_id')
      .eq('id', recipient.id)
      .single()

    const { data: updatedTask } = await supabase
      .from('signature_tasks')
      .select('id, status, completed_at')
      .eq('id', recipient.task_id)
      .single()

    // 12. 构造成功响应
    const response = {
      success: true,
      message: '签字操作成功完成',
      data: {
        signature: {
          position_id: updatedPosition.id,
          status: updatedPosition.status,
          content: updatedPosition.signature_content,
          signed_at: updatedPosition.signed_at
        },
        recipient: {
          id: updatedRecipient?.id || recipient.id,
          name: updatedRecipient?.name || recipient.name,
          status: updatedRecipient?.status || 'pending',
          signed_at: updatedRecipient?.signed_at
        },
        task: {
          id: updatedTask?.id || recipient.task_id,
          status: updatedTask?.status || 'in_progress',
          completed_at: updatedTask?.completed_at
        },
        automated_updates: {
          recipient_status_updated: updatedRecipient?.status === 'signed',
          task_completed: updatedTask?.status === 'completed',
          trigger_executed: true
        }
      },
      execution_time_ms: Date.now() - startTime
    }

    // 5. 返回成功响应（临时响应，后续步骤会实现真正的签字逻辑）
    return NextResponse.json(response)

  } catch (error) {
    console.error('签字执行API错误:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: '服务器内部错误',
        details: error instanceof Error ? error.message : '未知错误',
        execution_time_ms: Date.now() - startTime
      },
      { status: 500 }
    )
  }
} 