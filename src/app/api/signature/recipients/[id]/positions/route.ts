import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase/client'

/**
 * Task 5.2.2: 获取收件人签字位置API
 * GET /api/signature/recipients/[id]/positions
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

    const recipientId = params.id

    // 验证收件人存在且属于用户的任务
    const { data: recipient, error: recipientError } = await supabase
      .from('signature_recipients')
      .select(`
        id,
        task_id,
        name,
        email,
        status,
        token,
        expires_at,
        signature_tasks!inner(
          id,
          user_id,
          title,
          status
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

    // 获取收件人的所有签字位置，包含文件信息
    const { data: positions, error: positionsError } = await supabase
      .from('signature_positions')
      .select(`
        *,
        signature_files!inner(
          id,
          original_filename,
          display_name,
          file_order,
          status
        )
      `)
      .eq('recipient_id', recipientId)
      .order('signature_files.file_order', { ascending: true })
      .order('page_number', { ascending: true })

    if (positionsError) {
      throw new Error(`获取签字位置失败: ${positionsError.message}`)
    }

    // 整理位置数据，按文件分组
    const positionsByFile = new Map<string, any[]>()
    
    for (const position of positions || []) {
      const fileId = position.file_id
      if (!positionsByFile.has(fileId)) {
        positionsByFile.set(fileId, [])
      }
      
      positionsByFile.get(fileId)!.push({
        id: position.id,
        pageNumber: position.page_number,
        coordinates: {
          percent: {
            x: position.x_percent,
            y: position.y_percent,
            width: position.width_percent,
            height: position.height_percent
          },
          pixel: {
            x: position.x_pixel,
            y: position.y_pixel,
            width: position.width_pixel,
            height: position.height_pixel
          }
        },
        pageDimensions: {
          width: position.page_width,
          height: position.page_height
        },
        placeholderText: position.placeholder_text,
        status: position.status,
        signatureContent: position.signature_content,
        signedAt: position.signed_at,
        createdAt: position.created_at
      })
    }

    // 创建文件列表，包含签字位置
    const filesWithPositions = Array.from(positionsByFile.entries()).map(([fileId, filePositions]) => {
      const firstPosition = positions.find(p => p.file_id === fileId)
      return {
        file: {
          id: fileId,
          filename: firstPosition.signature_files.original_filename,
          displayName: firstPosition.signature_files.display_name,
          fileOrder: firstPosition.signature_files.file_order,
          status: firstPosition.signature_files.status
        },
        positions: filePositions
      }
    }).sort((a, b) => a.file.fileOrder - b.file.fileOrder)

    // 计算统计信息
    const totalPositions = positions.length
    const signedPositions = positions.filter(p => p.status === 'signed').length
    const pendingPositions = totalPositions - signedPositions
    const completionPercentage = totalPositions > 0 ? Math.round((signedPositions / totalPositions) * 100) : 0

    return NextResponse.json({
      success: true,
      data: {
        recipient: {
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          status: recipient.status,
          token: recipient.token,
          expiresAt: recipient.expires_at
        },
        task: {
          id: (recipient as any).signature_tasks.id,
          title: (recipient as any).signature_tasks.title,
          status: (recipient as any).signature_tasks.status
        },
        statistics: {
          totalPositions,
          signedPositions,
          pendingPositions,
          completionPercentage
        },
        filesWithPositions
      }
    })

  } catch (error) {
    console.error('获取收件人签字位置错误:', error)
    return NextResponse.json(
      { 
        error: '获取签字位置失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 