import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase/client'
import { getTaskById } from '@/lib/database/queries'

/**
 * PUT /api/signature/files/reorder
 * Update file order for a task
 */
export async function PUT(request: NextRequest) {
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
    const { taskId, updates } = body

    console.log('Reorder request:', { taskId, updates })

    if (!taskId || !updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Invalid request data', details: { taskId, updates } },
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

    // 验证所有文件ID都属于该任务
    const fileIds = updates.map(u => u.id);
    const { data: existingFiles, error: checkError } = await supabase
      .from('signature_files')
      .select('id')
      .eq('task_id', taskId)
      .in('id', fileIds);

    if (checkError || !existingFiles || existingFiles.length !== fileIds.length) {
      return NextResponse.json(
        { error: 'Some files do not belong to this task' },
        { status: 400 }
      )
    }

    // 批量更新文件顺序
    const updatePromises = updates.map(({ id, file_order }) => 
      supabase
        .from('signature_files')
        .update({ file_order })
        .eq('id', id)
        .eq('task_id', taskId)
    )

    const results = await Promise.all(updatePromises)
    
    // 检查是否有错误
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      console.error('File order update errors:', errors)
      return NextResponse.json(
        { error: 'Failed to update some file orders' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'File order updated successfully'
    })

  } catch (error) {
    console.error('File reorder error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to reorder files',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}