import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase/client'
import { 
  validateSignaturePosition, 
  percentageToPixel,
  percentageSizeToPixel,
  type SignaturePosition
} from '@/lib/coordinates'

/**
 * Task 5.2.1: 创建签字位置API
 * POST /api/signature/positions
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
    const { 
      recipientId, 
      fileId, 
      pageNumber, 
      x, 
      y, 
      width, 
      height,
      pageWidth = 595,    // PDF标准页面宽度
      pageHeight = 842,   // PDF标准页面高度
      placeholderText = 'Click to sign'
    } = body

    // 基础验证
    if (!recipientId || !fileId || !pageNumber || 
        x === undefined || y === undefined || 
        width === undefined || height === undefined) {
      return NextResponse.json(
        { error: '缺少必要参数: recipientId, fileId, pageNumber, x, y, width, height' },
        { status: 400 }
      )
    }

    // 验证收件人存在且属于用户的任务
    const { data: recipient, error: recipientError } = await supabase
      .from('signature_recipients')
      .select(`
        id,
        task_id,
        name,
        email,
        status,
        signature_tasks!inner(
          id,
          user_id,
          title
        )
      `)
      .eq('id', recipientId)
      .eq('signature_tasks.user_id', userId)
      .single()

    if (recipientError || !recipient) {
      return NextResponse.json(
        { error: '收件人不存在或无权限访问' },
        { status: 404 }
      )
    }

    // 验证文件存在且属于同一任务
    const { data: file, error: fileError } = await supabase
      .from('signature_files')
      .select('id, task_id, original_filename, display_name')
      .eq('id', fileId)
      .eq('task_id', recipient.task_id)
      .single()

    if (fileError || !file) {
      return NextResponse.json(
        { error: '文件不存在或不属于该任务' },
        { status: 404 }
      )
    }

    // 创建签字位置对象用于验证
    const position: SignaturePosition = {
      x,
      y,
      width,
      height,
      pageNumber,
      recipientId
    }

    // 坐标系统验证
    const coordinateValidation = validateSignaturePosition(position)
    if (!coordinateValidation.isValid) {
      return NextResponse.json(
        { 
          error: '坐标验证失败',
          details: coordinateValidation.errors
        },
        { status: 400 }
      )
    }

    // 检查位置冲突（同一文件、同一页面的其他签字位置）
    const { data: existingPositions, error: conflictError } = await supabase
      .from('signature_positions')
      .select('id, x_percent, y_percent, width_percent, height_percent, recipient_id')
      .eq('file_id', fileId)
      .eq('page_number', pageNumber)

    if (conflictError) {
      throw new Error(`检查位置冲突失败: ${conflictError.message}`)
    }

    // 冲突检测
    for (const existingPos of existingPositions || []) {
      // 计算重叠区域
      const overlapLeft = Math.max(x, existingPos.x_percent)
      const overlapRight = Math.min(x + width, existingPos.x_percent + existingPos.width_percent)
      const overlapTop = Math.max(y, existingPos.y_percent)
      const overlapBottom = Math.min(y + height, existingPos.y_percent + existingPos.height_percent)

      // 如果有重叠
      if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
        const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop)
        const currentArea = width * height
        const existingArea = existingPos.width_percent * existingPos.height_percent
        
        // 如果重叠面积超过任一签字框的20%，则认为冲突
        const overlapThreshold = 0.20
        if (overlapArea > currentArea * overlapThreshold || 
            overlapArea > existingArea * overlapThreshold) {
          return NextResponse.json(
            { 
              error: '签字位置冲突',
              details: `与现有签字位置重叠过多 (重叠面积: ${(overlapArea / Math.min(currentArea, existingArea) * 100).toFixed(1)}%)`
            },
            { status: 409 }
          )
        }
      }
    }

    // 转换为像素坐标
    const pixelPoint = percentageToPixel(
      { x, y },
      { width: pageWidth, height: pageHeight, pageNumber }
    )
    const pixelSize = percentageSizeToPixel(
      { width, height },
      { width: pageWidth, height: pageHeight, pageNumber }
    )

    // 创建签字位置记录
    const { data: newPosition, error: insertError } = await supabase
      .from('signature_positions')
      .insert({
        recipient_id: recipientId,
        file_id: fileId,
        page_number: pageNumber,
        x_percent: x,
        y_percent: y,
        width_percent: width,
        height_percent: height,
        x_pixel: pixelPoint.x,
        y_pixel: pixelPoint.y,
        width_pixel: pixelSize.width,
        height_pixel: pixelSize.height,
        page_width: pageWidth,
        page_height: pageHeight,
        placeholder_text: placeholderText
      })
      .select(`
        *,
        signature_recipients!inner(id, name, email),
        signature_files!inner(id, original_filename, display_name)
      `)
      .single()

    if (insertError) {
      throw new Error(`创建签字位置失败: ${insertError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: '签字位置创建成功',
      data: {
        id: newPosition.id,
        recipient: {
          id: newPosition.signature_recipients.id,
          name: newPosition.signature_recipients.name,
          email: newPosition.signature_recipients.email
        },
        file: {
          id: newPosition.signature_files.id,
          filename: newPosition.signature_files.original_filename,
          displayName: newPosition.signature_files.display_name
        },
        position: {
          pageNumber: newPosition.page_number,
          coordinates: {
            percent: {
              x: newPosition.x_percent,
              y: newPosition.y_percent,
              width: newPosition.width_percent,
              height: newPosition.height_percent
            },
            pixel: {
              x: newPosition.x_pixel,
              y: newPosition.y_pixel,
              width: newPosition.width_pixel,
              height: newPosition.height_pixel
            }
          },
          pageDimensions: {
            width: newPosition.page_width,
            height: newPosition.page_height
          }
        },
        placeholderText: newPosition.placeholder_text,
        status: newPosition.status,
        createdAt: newPosition.created_at
      }
    })

  } catch (error) {
    console.error('创建签字位置错误:', error)
    return NextResponse.json(
      { 
        error: '创建签字位置失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 