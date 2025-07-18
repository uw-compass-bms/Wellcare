import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { uploadFile, generateFilePath, validateFileType, validateFileSize } from '@/lib/storage/simple-uploader'
import { getTaskById } from '@/lib/database/queries'
import { supabase } from '@/lib/supabase/client'

/**
 * Task 3.2: 文件上传API
 * POST /api/signature/files
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const taskId = formData.get('taskId') as string

    if (!file) {
      return NextResponse.json(
        { error: '没有找到文件' },
        { status: 400 }
      )
    }

    if (!taskId) {
      return NextResponse.json(
        { error: '缺少taskId参数' },
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

    // 验证文件类型
    if (!validateFileType(file)) {
      return NextResponse.json(
        { error: '不支持的文件类型，只支持PDF和图片' },
        { status: 400 }
      )
    }

    // 验证文件大小
    if (!validateFileSize(file)) {
      return NextResponse.json(
        { error: '文件大小超过限制(10MB)' },
        { status: 400 }
      )
    }

    // 生成文件路径并上传
    const filePath = generateFilePath(userId, taskId, file.name)
    const fileUrl = await uploadFile(file, filePath)

    // 获取文件顺序（当前任务文件数+1）
    const { data: existingFiles } = await supabase
      .from('signature_files')
      .select('file_order')
      .eq('task_id', taskId)
      .order('file_order', { ascending: false })
      .limit(1)

    const nextOrder = existingFiles && existingFiles.length > 0 
      ? existingFiles[0].file_order + 1 
      : 1

    // 存储文件信息到数据库
    const { data: fileRecord, error: dbError } = await supabase
      .from('signature_files')
      .insert({
        task_id: taskId,
        original_filename: file.name,
        display_name: file.name,
        file_size: file.size,
        original_file_url: fileUrl,
        file_order: nextOrder
      })
      .select()
      .single()

    if (dbError) {
      throw new Error(`数据库存储失败: ${dbError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: '文件上传成功',
      data: fileRecord
    })

  } catch (error) {
    console.error('文件上传错误:', error)
    return NextResponse.json(
      { 
        error: '文件上传失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/signature/files
 * Fetch files for a task
 */
export async function GET(request: NextRequest) {
  try {
    // JWT认证
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const taskId = searchParams.get('taskId')

    if (!taskId) {
      return NextResponse.json(
        { error: '缺少taskId参数' },
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

    // 获取任务的文件列表
    const { data: files, error } = await supabase
      .from('signature_files')
      .select('*')
      .eq('task_id', taskId)

    if (error) {
      console.error('Database error:', error);
      // 返回空数组而不是错误，允许系统继续工作
      return NextResponse.json({
        success: true,
        data: [],
        message: `Database query failed: ${error.message}`
      });
    }

    // 转换文件数据格式
    const formattedFiles = files.map(file => ({
      id: file.id,
      displayName: file.display_name || file.original_filename,
      originalFilename: file.original_filename,
      supabaseUrl: file.file_url,
      fileType: file.file_type,
      fileSize: file.file_size,
      pageCount: file.page_count || 1
    }))

    return NextResponse.json({
      success: true,
      data: formattedFiles
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