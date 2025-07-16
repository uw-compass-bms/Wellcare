import { NextRequest, NextResponse } from 'next/server'
import { validateRecipientToken } from '@/lib/auth/token-validator'
import { supabase } from '@/lib/supabase/client'

/**
 * GET /api/sign/verify?token=xxx
 * 验证收件人token并获取个性化签字界面数据
 * 
 * 功能：
 * 1. 验证token有效性和过期时间
 * 2. 获取任务和文件信息
 * 3. 只返回当前收件人的签字位置
 * 4. 隐藏其他收件人的信息
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 获取并验证token参数
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Token参数缺失' 
        },
        { status: 400 }
      )
    }

    // 2. 验证token
    console.log('验证token:', token)
    const tokenValidation = await validateRecipientToken(token)
    
    if (!tokenValidation.valid) {
      return NextResponse.json(
        {
          valid: false,
          expired: tokenValidation.expired || false,
          error: tokenValidation.error || 'Token验证失败'
        },
        { status: tokenValidation.expired ? 410 : 401 }
      )
    }

    const recipient = tokenValidation.recipient!

    // 3. 检查收件人状态 - 只有pending状态的收件人可以签字
    if (recipient.status !== 'pending') {
      const statusMessages = {
        'signed': '您已完成签字',
        'cancelled': '签字已被取消',
        'expired': '签字已过期'
      }
      
      return NextResponse.json(
        {
          valid: false,
          error: statusMessages[recipient.status as keyof typeof statusMessages] || '签字状态异常'
        },
        { status: 410 }
      )
    }

    // 4. 获取任务详细信息
    const { data: task, error: taskError } = await supabase
      .from('signature_tasks')
      .select('id, title, description, status')
      .eq('id', recipient.taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { 
          valid: false, 
          error: '任务信息获取失败' 
        },
        { status: 404 }
      )
    }

    // 5. 检查任务状态
    if (task.status !== 'in_progress') {
      const taskStatusMessages = {
        'draft': '任务尚未发布',
        'completed': '任务已完成',
        'cancelled': '任务已取消'
      }
      
      return NextResponse.json(
        {
          valid: false,
          error: taskStatusMessages[task.status as keyof typeof taskStatusMessages] || '任务状态异常'
        },
        { status: 410 }
      )
    }

    // 6. 获取任务相关文件
    const { data: files, error: filesError } = await supabase
      .from('signature_files')
      .select('id, filename, file_url, page_count, file_size')
      .eq('task_id', recipient.taskId)
      .order('upload_order', { ascending: true })

    if (filesError) {
      return NextResponse.json(
        { 
          valid: false, 
          error: '文件信息获取失败' 
        },
        { status: 500 }
      )
    }

    // 7. 获取当前收件人的签字位置（个性化过滤）
    const { data: positions, error: positionsError } = await supabase
      .from('signature_positions')
      .select('id, file_id, page, x, y, width, height, status, placeholder_text, signed_at, signature_content')
      .eq('recipient_id', recipient.id)
      .order('created_at', { ascending: true })

    if (positionsError) {
      return NextResponse.json(
        { 
          valid: false, 
          error: '签字位置信息获取失败' 
        },
        { status: 500 }
      )
    }

    // 8. 组织文件和位置数据
    const filesWithPositions = files.map(file => ({
      id: file.id,
      filename: file.filename,
      file_url: file.file_url,
      page_count: file.page_count,
      file_size: file.file_size,
      positions: positions
        .filter(pos => pos.file_id === file.id)
        .map(pos => ({
          id: pos.id,
          page: pos.page,
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          status: pos.status,
          placeholder_text: pos.placeholder_text || `${recipient.name} - 点击签字`,
          signed_at: pos.signed_at,
          signature_content: pos.signature_content
        }))
    }))

    // 9. 计算签字进度
    const totalPositions = positions.length
    const signedPositions = positions.filter(pos => pos.status === 'signed').length
    const isAllSigned = totalPositions > 0 && signedPositions === totalPositions

    // 10. 返回个性化签字界面数据
    return NextResponse.json({
      valid: true,
      recipient: {
        id: recipient.id,
        name: recipient.name,
        email: recipient.email
      },
      task: {
        id: task.id,
        title: task.title,
        description: task.description
      },
      files: filesWithPositions,
      progress: {
        total_positions: totalPositions,
        signed_positions: signedPositions,
        is_all_signed: isAllSigned,
        completion_percentage: totalPositions > 0 ? Math.round((signedPositions / totalPositions) * 100) : 0
      },
      signing_instructions: totalPositions > 0 ? 
        `请在 ${totalPositions} 个位置完成签字` : 
        '暂无需要签字的位置'
    })

  } catch (error) {
    console.error('Token验证端点错误:', error)
    return NextResponse.json(
      { 
        valid: false, 
        error: error instanceof Error ? error.message : '服务器内部错误' 
      },
      { status: 500 }
    )
  }
} 