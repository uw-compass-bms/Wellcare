import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getTaskById } from '@/lib/database/queries'
import { supabase } from '@/lib/supabase/client'

/**
 * GET /api/signature/tasks/[id]/files
 * 获取任务的文件列表
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

    // 获取任务的文件列表
    const { data: files, error } = await supabase
      .from('signature_files')
      .select('*')
      .eq('task_id', taskId)
      .order('file_order', { ascending: true })

    if (error) {
      throw new Error(`获取文件列表失败: ${error.message}`)
    }

    // 处理文件URL
    const processedFiles = files?.map(file => ({
      id: file.id,
      original_filename: file.original_filename,
      display_name: file.display_name || file.original_filename,
      file_size: file.file_size,
      mime_type: file.mime_type,
      status: file.status,
      file_order: file.file_order,
      uploaded_at: file.uploaded_at,
      supabase_url: file.supabase_url,
      // 生成预览URL
      preview_url: file.supabase_url ? `${file.supabase_url}#toolbar=0&navpanes=0&scrollbar=0` : null
    })) || []

    return NextResponse.json({
      success: true,
      data: processedFiles,
      task: {
        id: taskResult.data.id,
        title: taskResult.data.title
      }
    })

  } catch (error) {
    console.error('获取文件列表错误:', error)
    return NextResponse.json(
      { 
        error: '获取文件列表失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}