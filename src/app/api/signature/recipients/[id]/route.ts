import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase/client'

/**
 * Step 4.3.1: PUT /api/signature/recipients/[id] - 更新收件人信息
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // JWT认证
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const recipientId = params.id
    const body = await request.json()
    const { name, email } = body

    // 基础验证
    if (!name || !email) {
      return NextResponse.json(
        { error: '缺少必要参数: name, email' },
        { status: 400 }
      )
    }

    // 验证收件人存在且属于用户的任务
    const { data: existingRecipient, error: fetchError } = await supabase
      .from('signature_recipients')
      .select('id, task_id, name, email')
      .eq('id', recipientId)
      .single()

    if (fetchError || !existingRecipient) {
      return NextResponse.json(
        { error: '收件人不存在' },
        { status: 404 }
      )
    }

    // 验证任务属于当前用户
    const { data: task, error: taskError } = await supabase
      .from('signature_tasks')
      .select('user_id')
      .eq('id', existingRecipient.task_id)
      .single()

    if (taskError || !task || task.user_id !== userId) {
      return NextResponse.json(
        { error: '无权限访问此收件人' },
        { status: 403 }
      )
    }

    // 邮箱格式验证
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '邮箱格式无效' },
        { status: 400 }
      )
    }

    // 验证邮箱长度
    if (email.length > 254) {
      return NextResponse.json(
        { error: '邮箱长度不能超过254个字符' },
        { status: 400 }
      )
    }

    // 验证姓名长度
    if (name.length > 100) {
      return NextResponse.json(
        { error: '姓名长度不能超过100个字符' },
        { status: 400 }
      )
    }

    // 邮箱去重检查（同一任务中，排除当前记录）
    const { data: duplicateRecipient, error: checkError } = await supabase
      .from('signature_recipients')
      .select('id, email')
      .eq('task_id', existingRecipient.task_id)
      .eq('email', email.toLowerCase())
      .neq('id', recipientId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = 没有找到记录，这是我们期望的
      throw new Error(`检查邮箱重复失败: ${checkError.message}`)
    }

    if (duplicateRecipient) {
      return NextResponse.json(
        { error: '该邮箱已被其他收件人使用' },
        { status: 409 }
      )
    }

    // 更新收件人信息
    const { data: updatedRecipient, error: updateError } = await supabase
      .from('signature_recipients')
      .update({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', recipientId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`更新收件人失败: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: '收件人信息更新成功',
      data: updatedRecipient
    })

  } catch (error) {
    console.error('更新收件人错误:', error)
    return NextResponse.json(
      { 
        error: '更新收件人失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * Step 4.3.2: DELETE /api/signature/recipients/[id] - 删除收件人
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // JWT认证
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const recipientId = params.id

    // 验证收件人存在且属于用户的任务
    const { data: existingRecipient, error: fetchError } = await supabase
      .from('signature_recipients')
      .select('id, task_id, name, email, status')
      .eq('id', recipientId)
      .single()

    if (fetchError || !existingRecipient) {
      return NextResponse.json(
        { error: '收件人不存在' },
        { status: 404 }
      )
    }

    // 验证任务属于当前用户
    const { data: task, error: taskError } = await supabase
      .from('signature_tasks')
      .select('user_id')
      .eq('id', existingRecipient.task_id)
      .single()

    if (taskError || !task || task.user_id !== userId) {
      return NextResponse.json(
        { error: '无权限删除此收件人' },
        { status: 403 }
      )
    }

    // 检查收件人状态，如果已签字则不能删除
    if (existingRecipient.status === 'signed') {
      return NextResponse.json(
        { error: '已签字的收件人无法删除' },
        { status: 400 }
      )
    }

    // 删除相关的签字位置记录（如果有）
    const { error: positionsDeleteError } = await supabase
      .from('signature_positions')
      .delete()
      .eq('recipient_id', recipientId)

    if (positionsDeleteError) {
      console.warn('删除签字位置失败:', positionsDeleteError.message)
      // 不阻止删除收件人，只记录警告
    }

    // 删除收件人记录
    const { error: deleteError } = await supabase
      .from('signature_recipients')
      .delete()
      .eq('id', recipientId)

    if (deleteError) {
      throw new Error(`删除收件人失败: ${deleteError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: '收件人删除成功',
      data: {
        deletedRecipientId: recipientId,
        deletedName: existingRecipient.name,
        deletedEmail: existingRecipient.email
      }
    })

  } catch (error) {
    console.error('删除收件人错误:', error)
    return NextResponse.json(
      { 
        error: '删除收件人失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 