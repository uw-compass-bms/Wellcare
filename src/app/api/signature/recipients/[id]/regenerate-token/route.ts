import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase/client'

/**
 * Step 4.3.3: POST /api/signature/recipients/[id]/regenerate-token - 重新生成Token
 */
export async function POST(
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
      .select('id, task_id, name, email, status, token')
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
        { error: '无权限为此收件人重新生成Token' },
        { status: 403 }
      )
    }

    // 检查收件人状态，如果已签字则不能重新生成token
    if (existingRecipient.status === 'signed') {
      return NextResponse.json(
        { error: '已签字的收件人无法重新生成Token' },
        { status: 400 }
      )
    }

    // 生成新的token
    const { data: newTokenData, error: tokenError } = await supabase
      .rpc('generate_recipient_token')

    if (tokenError) {
      throw new Error(`生成新Token失败: ${tokenError.message}`)
    }

    // 计算新的过期时间（固定30天）
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // 更新收件人的token和过期时间
    const { data: updatedRecipient, error: updateError } = await supabase
      .from('signature_recipients')
      .update({
        token: newTokenData,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', recipientId)
      .select('id, name, email, token, expires_at, updated_at')
      .single()

    if (updateError) {
      throw new Error(`更新Token失败: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Token重新生成成功',
      data: {
        recipientId: updatedRecipient.id,
        name: updatedRecipient.name,
        email: updatedRecipient.email,
        newToken: updatedRecipient.token,
        oldToken: existingRecipient.token,
        expiresAt: updatedRecipient.expires_at,
        updatedAt: updatedRecipient.updated_at
      }
    })

  } catch (error) {
    console.error('重新生成Token错误:', error)
    return NextResponse.json(
      { 
        error: '重新生成Token失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 