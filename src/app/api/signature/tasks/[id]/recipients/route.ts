import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTaskById } from '@/lib/database/queries'
import { supabase } from '@/lib/supabase/client'

/**
 * Step 4.1.2: 获取任务收件人列表API
 * GET /api/signature/tasks/[id]/recipients
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: taskId } = await params

    // 验证任务存在且属于用户
    const taskResult = await getTaskById(taskId, userId)
    if (!taskResult.success) {
      return NextResponse.json(
        { error: '任务不存在或无权限访问' },
        { status: 404 }
      )
    }

    // 获取任务的收件人列表
    const { data: recipients, error } = await supabase
      .from('signature_recipients')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`获取收件人列表失败: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      data: recipients,
      task: {
        id: taskResult.data.id,
        title: taskResult.data.title
      }
    })

  } catch (error) {
    console.error('获取收件人列表错误:', error)
    return NextResponse.json(
      { 
        error: '获取收件人列表失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 