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
 * Task 5.2.3: 更新签字位置API
 * PUT /api/signature/positions/[id]
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

    const positionId = params.id
    const body = await request.json()
    const { 
      x, 
      y, 
      width, 
      height,
      pageNumber,
      pageWidth,
      pageHeight,
      placeholderText
    } = body

    // 验证位置存在且属于用户的任务
    const { data: existingPosition, error: fetchError } = await supabase
      .from('signature_positions')
      .select(`
        *,
        signature_recipients!inner(
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
        ),
        signature_files!inner(
          id,
          original_filename,
          display_name
        )
      `)
      .eq('id', positionId)
      .eq('signature_recipients.signature_tasks.user_id', userId)
      .single()

    if (fetchError || !existingPosition) {
      return NextResponse.json(
        { error: '签字位置不存在或无权限访问' },
        { status: 404 }
      )
    }

    // 检查位置状态，如果已签字则不能更新
    if (existingPosition.status === 'signed') {
      return NextResponse.json(
        { error: '已签字的位置无法修改' },
        { status: 400 }
      )
    }

    // 准备更新数据
    const updates: any = {}

    // 如果提供了坐标更新
    if (x !== undefined || y !== undefined || width !== undefined || height !== undefined || pageNumber !== undefined) {
      // 使用现有值或新值
      const newX = x !== undefined ? x : existingPosition.x_percent
      const newY = y !== undefined ? y : existingPosition.y_percent
      const newWidth = width !== undefined ? width : existingPosition.width_percent
      const newHeight = height !== undefined ? height : existingPosition.height_percent
      const newPageNumber = pageNumber !== undefined ? pageNumber : existingPosition.page_number
      const newPageWidth = pageWidth !== undefined ? pageWidth : existingPosition.page_width
      const newPageHeight = pageHeight !== undefined ? pageHeight : existingPosition.page_height

      // 创建签字位置对象用于验证
      const position: SignaturePosition = {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        pageNumber: newPageNumber,
        recipientId: existingPosition.recipient_id
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

      // 检查位置冲突（除了当前位置外的其他位置）
      const { data: existingPositions, error: conflictError } = await supabase
        .from('signature_positions')
        .select('id, x_percent, y_percent, width_percent, height_percent, recipient_id')
        .eq('file_id', existingPosition.file_id)
        .eq('page_number', newPageNumber)
        .neq('id', positionId)

      if (conflictError) {
        throw new Error(`检查位置冲突失败: ${conflictError.message}`)
      }

      // 冲突检测
      for (const conflictPos of existingPositions || []) {
        // 计算重叠区域
        const overlapLeft = Math.max(newX, conflictPos.x_percent)
        const overlapRight = Math.min(newX + newWidth, conflictPos.x_percent + conflictPos.width_percent)
        const overlapTop = Math.max(newY, conflictPos.y_percent)
        const overlapBottom = Math.min(newY + newHeight, conflictPos.y_percent + conflictPos.height_percent)

        // 如果有重叠
        if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
          const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop)
          const currentArea = newWidth * newHeight
          const existingArea = conflictPos.width_percent * conflictPos.height_percent
          
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
        { x: newX, y: newY },
        { width: newPageWidth, height: newPageHeight, pageNumber: newPageNumber }
      )
      const pixelSize = percentageSizeToPixel(
        { width: newWidth, height: newHeight },
        { width: newPageWidth, height: newPageHeight, pageNumber: newPageNumber }
      )

      // 添加坐标更新
      updates.x_percent = newX
      updates.y_percent = newY
      updates.width_percent = newWidth
      updates.height_percent = newHeight
      updates.page_number = newPageNumber
      updates.x_pixel = pixelPoint.x
      updates.y_pixel = pixelPoint.y
      updates.width_pixel = pixelSize.width
      updates.height_pixel = pixelSize.height
      updates.page_width = newPageWidth
      updates.page_height = newPageHeight
    }

    // 如果提供了占位符文本更新
    if (placeholderText !== undefined) {
      updates.placeholder_text = placeholderText
    }

    // 检查是否有可更新的字段
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: '没有提供需要更新的字段' },
        { status: 400 }
      )
    }

    // 执行更新
    const { data: updatedPosition, error: updateError } = await supabase
      .from('signature_positions')
      .update(updates)
      .eq('id', positionId)
      .select(`
        *,
        signature_recipients!inner(id, name, email),
        signature_files!inner(id, original_filename, display_name)
      `)
      .single()

    if (updateError) {
      throw new Error(`更新签字位置失败: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: '签字位置更新成功',
      data: {
        id: updatedPosition.id,
        recipient: {
          id: updatedPosition.signature_recipients.id,
          name: updatedPosition.signature_recipients.name,
          email: updatedPosition.signature_recipients.email
        },
        file: {
          id: updatedPosition.signature_files.id,
          filename: updatedPosition.signature_files.original_filename,
          displayName: updatedPosition.signature_files.display_name
        },
        position: {
          pageNumber: updatedPosition.page_number,
          coordinates: {
            percent: {
              x: updatedPosition.x_percent,
              y: updatedPosition.y_percent,
              width: updatedPosition.width_percent,
              height: updatedPosition.height_percent
            },
            pixel: {
              x: updatedPosition.x_pixel,
              y: updatedPosition.y_pixel,
              width: updatedPosition.width_pixel,
              height: updatedPosition.height_pixel
            }
          },
          pageDimensions: {
            width: updatedPosition.page_width,
            height: updatedPosition.page_height
          }
        },
        placeholderText: updatedPosition.placeholder_text,
        status: updatedPosition.status,
        updatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('更新签字位置错误:', error)
    return NextResponse.json(
      { 
        error: '更新签字位置失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * Task 5.2.4: 删除签字位置API
 * DELETE /api/signature/positions/[id]
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

    const positionId = params.id

    // 验证位置存在且属于用户的任务
    const { data: existingPosition, error: fetchError } = await supabase
      .from('signature_positions')
      .select(`
        *,
        signature_recipients!inner(
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
        ),
        signature_files!inner(
          id,
          original_filename,
          display_name
        )
      `)
      .eq('id', positionId)
      .eq('signature_recipients.signature_tasks.user_id', userId)
      .single()

    if (fetchError || !existingPosition) {
      return NextResponse.json(
        { error: '签字位置不存在或无权限访问' },
        { status: 404 }
      )
    }

    // 检查位置状态，如果已签字则不能删除
    if (existingPosition.status === 'signed') {
      return NextResponse.json(
        { error: '已签字的位置无法删除' },
        { status: 400 }
      )
    }

    // 删除签字位置
    const { error: deleteError } = await supabase
      .from('signature_positions')
      .delete()
      .eq('id', positionId)

    if (deleteError) {
      throw new Error(`删除签字位置失败: ${deleteError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: '签字位置删除成功',
      data: {
        deletedPositionId: positionId,
        recipient: {
          id: existingPosition.signature_recipients.id,
          name: existingPosition.signature_recipients.name,
          email: existingPosition.signature_recipients.email
        },
        file: {
          id: existingPosition.signature_files.id,
          filename: existingPosition.signature_files.original_filename,
          displayName: existingPosition.signature_files.display_name
        },
        position: {
          pageNumber: existingPosition.page_number,
          coordinates: {
            percent: {
              x: existingPosition.x_percent,
              y: existingPosition.y_percent,
              width: existingPosition.width_percent,
              height: existingPosition.height_percent
            }
          }
        }
      }
    })

  } catch (error) {
    console.error('删除签字位置错误:', error)
    return NextResponse.json(
      { 
        error: '删除签字位置失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 