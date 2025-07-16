import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTaskById } from '@/lib/database/queries'
import { supabase } from '@/lib/supabase/client'

/**
 * Step 4.1.1-4.1.3: 添加收件人API (含邮箱验证和去重)
 * POST /api/signature/recipients
 */
export async function POST(request: NextRequest) {
  try {
    // JWT认证
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { taskId, name, email } = body

    // 基础验证
    if (!taskId || !name || !email) {
      return NextResponse.json(
        { error: '缺少必要参数: taskId, name, email' },
        { status: 400 }
      )
    }

    // 验证任务存在且属于用户
    const taskResult = await getTaskById(taskId, userId)
    if (!taskResult.success) {
      return NextResponse.json(
        { error: '任务不存在或无权限访问' },
        { status: 404 }
      )
    }

    // Step 4.1.3: 增强邮箱格式验证
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

    // Step 4.1.3: 邮箱去重检查
    const { data: existingRecipient, error: checkError } = await supabase
      .from('signature_recipients')
      .select('id, email')
      .eq('task_id', taskId)
      .eq('email', email.toLowerCase())
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = 没有找到记录，这是我们期望的
      throw new Error(`检查邮箱重复失败: ${checkError.message}`)
    }

    if (existingRecipient) {
      return NextResponse.json(
        { error: '该邮箱已经添加过了' },
        { status: 409 }
      )
    }

    // 验证收件人姓名
    if (name.length > 100) {
      return NextResponse.json(
        { error: '姓名长度不能超过100个字符' },
        { status: 400 }
      )
    }

    // 生成token
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_recipient_token')

    if (tokenError) {
      throw new Error(`生成token失败: ${tokenError.message}`)
    }

    // 创建收件人记录
    const { data: recipient, error: insertError } = await supabase
      .from('signature_recipients')
      .insert({
        task_id: taskId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        token: tokenData,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`创建收件人失败: ${insertError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: '收件人添加成功',
      data: recipient
    })

  } catch (error) {
    console.error('添加收件人错误:', error)
    return NextResponse.json(
      { 
        error: '添加收件人失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 