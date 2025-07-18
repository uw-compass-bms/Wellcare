import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth/middleware'
import { supabase } from '@/lib/supabase/client'

/**
 * Task 5.2.1: 创建签字位置API
 * POST /api/signature/positions
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] POST /api/signature/positions - Start');
    
    // 使用统一的认证中间件
    const authResult = await validateAuth()
    if (!authResult.success) {
      console.error('[API] Auth failed:', authResult.error);
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      )
    }
    
    const userId = authResult.userId!
    console.log('[API] Auth success, userId:', userId);

    const body = await request.json()
    console.log('[API] Request body:', JSON.stringify(body, null, 2));
    
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
      placeholderText = 'Click to sign',
      fieldType = 'signature',  // 默认为签名字段
      fieldMeta = {},          // 字段元数据
      isRequired = true        // 默认必填
    } = body

    console.log('[API] Creating position for recipient:', recipientId);

    // 基础验证
    if (!recipientId || !fileId || !pageNumber || 
        x === undefined || y === undefined || 
        width === undefined || height === undefined) {
      return NextResponse.json(
        { error: '缺少必要参数: recipientId, fileId, pageNumber, x, y, width, height' },
        { status: 400 }
      )
    }

    // 验证字段类型
    const validFieldTypes = ['signature', 'date', 'text', 'name', 'email', 'number', 'checkbox']
    if (!validFieldTypes.includes(fieldType)) {
      return NextResponse.json(
        { error: `无效的字段类型: ${fieldType}。有效类型: ${validFieldTypes.join(', ')}` },
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

    // 简化坐标验证（去掉复杂的坐标系统验证）
    if (x < 0 || x > 100 || y < 0 || y > 100 || 
        width <= 0 || width > 100 || height <= 0 || height > 100) {
      return NextResponse.json(
        { 
          error: '坐标验证失败',
          details: '坐标必须在0-100范围内，尺寸必须大于0'
        },
        { status: 400 }
      )
    }

    // 简化的位置冲突检测 - 只检查完全重叠（90%以上）
    // 参考OpenSign的做法，允许更灵活的位置放置
    const { data: existingPositions, error: conflictError } = await supabase
      .from('signature_positions')
      .select('id, x_percent, y_percent, width_percent, height_percent, recipient_id')
      .eq('file_id', fileId)
      .eq('page_number', pageNumber)
      .eq('recipient_id', recipientId)

    if (conflictError) {
      throw new Error(`检查位置冲突失败: ${conflictError.message}`)
    }

    console.log('[API] Existing positions for recipient:', existingPositions?.length || 0);

    // 只检查严重重叠的情况（90%以上重叠）
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
        
        // 只有当重叠面积超过90%时才认为是冲突
        const overlapThreshold = 0.90
        if (overlapArea > currentArea * overlapThreshold && 
            overlapArea > existingArea * overlapThreshold) {
          console.log('[API] Significant overlap detected:', {
            overlap: (overlapArea / Math.min(currentArea, existingArea) * 100).toFixed(1) + '%',
            existingPos: { x: existingPos.x_percent, y: existingPos.y_percent },
            newPos: { x, y }
          });
          
          return NextResponse.json(
            { 
              error: '签字位置重复',
              details: `该位置已存在签字框，请选择其他位置`
            },
            { status: 409 }
          )
        }
      }
    }

    // 简化像素坐标转换
    const pixelX = Math.round((x / 100) * pageWidth)
    const pixelY = Math.round((y / 100) * pageHeight)
    const pixelWidth = Math.round((width / 100) * pageWidth)
    const pixelHeight = Math.round((height / 100) * pageHeight)

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
        x_pixel: pixelX,
        y_pixel: pixelY,
        width_pixel: pixelWidth,
        height_pixel: pixelHeight,
        page_width: Math.round(pageWidth),
        page_height: Math.round(pageHeight),
        placeholder_text: placeholderText,
        field_type: fieldType,
        field_meta: fieldMeta,
        is_required: isRequired
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
        fieldType: newPosition.field_type,
        fieldMeta: newPosition.field_meta,
        isRequired: newPosition.is_required,
        status: newPosition.status,
        createdAt: newPosition.created_at
      }
    })

  } catch (error) {
    console.error('[API] 创建签字位置错误:', error)
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        error: '创建签字位置失败',
        details: error instanceof Error ? error.message : String(error),
        message: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/signature/positions
 * 获取签字位置列表
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API] GET /api/signature/positions - Start');
    
    // 使用统一的认证中间件
    const authResult = await validateAuth()
    if (!authResult.success) {
      console.error('[API] Auth failed:', authResult.error);
      return NextResponse.json(
        { error: 'Unauthorized', message: authResult.error },
        { status: 401 }
      )
    }
    
    const userId = authResult.userId!
    console.log('[API] Auth success, userId:', userId);

    const searchParams = request.nextUrl.searchParams
    const fileId = searchParams.get('fileId')
    const taskId = searchParams.get('taskId')
    const recipientId = searchParams.get('recipientId')

    // 构建查询
    let query = supabase
      .from('signature_positions')
      .select(`
        *,
        signature_recipients!inner(
          id, 
          name, 
          email,
          task_id,
          signature_tasks!inner(
            id,
            user_id
          )
        )
      `)
      .eq('signature_recipients.signature_tasks.user_id', userId)

    // 应用过滤条件
    if (fileId) {
      query = query.eq('file_id', fileId)
    }
    
    if (recipientId) {
      query = query.eq('recipient_id', recipientId)
    }

    if (taskId) {
      query = query.eq('signature_recipients.task_id', taskId)
    }

    const { data: positions, error } = await query

    if (error) {
      console.error('[API] 查询签字位置错误:', error)
      throw new Error(`查询签字位置失败: ${error.message}`)
    }

    console.log('[API] Found positions:', positions?.length || 0)

    return NextResponse.json({
      success: true,
      data: positions || []
    })

  } catch (error) {
    console.error('[API] 获取签字位置错误:', error)
    return NextResponse.json(
      { 
        error: '获取签字位置失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 