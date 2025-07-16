import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase/client'
import { deleteFile } from '@/lib/storage/simple-uploader'

/**
 * Task 3.3: 获取文件信息API
 * GET /api/signature/files/[id]
 */
export async function GET(
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

    const fileId = params.id

    // 获取文件信息，同时验证权限
    const { data: file, error } = await supabase
      .from('signature_files')
      .select(`
        *,
        signature_tasks!inner(
          id,
          user_id,
          title
        )
      `)
      .eq('id', fileId)
      .eq('signature_tasks.user_id', userId)
      .single()

    if (error || !file) {
      return NextResponse.json(
        { error: '文件不存在或无权限访问' },
        { status: 404 }
      )
    }

    // 返回文件信息
    return NextResponse.json({
      success: true,
      data: {
        id: file.id,
        taskId: file.task_id,
        originalFilename: file.original_filename,
        displayName: file.display_name,
        fileSize: file.file_size,
        originalFileUrl: file.original_file_url,
        finalFileUrl: file.final_file_url,
        fileOrder: file.file_order,
        status: file.status,
        uploadedAt: file.uploaded_at,
        completedAt: file.completed_at,
        task: {
          id: file.signature_tasks.id,
          title: file.signature_tasks.title
        }
      }
    })

  } catch (error) {
    console.error('获取文件信息错误:', error)
    return NextResponse.json(
      { 
        error: '获取文件信息失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * Task 3.3: 删除文件API
 * DELETE /api/signature/files/[id]
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

    const fileId = params.id

    // 获取文件信息，验证权限
    const { data: file, error } = await supabase
      .from('signature_files')
      .select(`
        *,
        signature_tasks!inner(
          id,
          user_id,
          title
        )
      `)
      .eq('id', fileId)
      .eq('signature_tasks.user_id', userId)
      .single()

    if (error || !file) {
      return NextResponse.json(
        { error: '文件不存在或无权限访问' },
        { status: 404 }
      )
    }

    // 从URL中提取文件路径
    const url = file.original_file_url
    const pathMatch = url.match(/\/object\/public\/signature-files\/(.+)$/)
    
    if (pathMatch) {
      const filePath = pathMatch[1]
      try {
        // 从存储桶删除文件
        await deleteFile(filePath)
      } catch (storageError) {
        console.warn('存储文件删除失败:', storageError)
        // 继续删除数据库记录，即使存储文件删除失败
      }
    }

    // 从数据库删除文件记录
    const { error: dbError } = await supabase
      .from('signature_files')
      .delete()
      .eq('id', fileId)

    if (dbError) {
      throw new Error(`数据库删除失败: ${dbError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: '文件删除成功',
      data: {
        id: fileId,
        filename: file.original_filename
      }
    })

  } catch (error) {
    console.error('删除文件错误:', error)
    return NextResponse.json(
      { 
        error: '文件删除失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 