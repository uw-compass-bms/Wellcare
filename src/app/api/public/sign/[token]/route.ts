import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

/**
 * 公开签字API - 不需要认证
 * GET /api/public/sign/[token] - 获取签字任务信息
 * POST /api/public/sign/[token] - 更新签字状态
 */

// GET - 获取签字信息
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // 1. 验证token并获取收件人信息
    const { data: recipient, error: recipientError } = await supabase
      .from('signature_recipients')
      .select(`
        *,
        signature_tasks!inner(
          id,
          title,
          description,
          status
        )
      `)
      .eq('token', token)
      .single();

    if (recipientError || !recipient) {
      return NextResponse.json({
        success: false,
        error: 'Invalid token'
      }, { status: 404 });
    }

    // 2. 检查token是否过期
    if (new Date(recipient.expires_at) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'Token expired'
      }, { status: 410 });
    }

    // 3. 获取文件列表
    const { data: files, error: filesError } = await supabase
      .from('signature_files')
      .select('*')
      .eq('task_id', recipient.task_id)
      .order('file_order');

    if (filesError || !files) {
      return NextResponse.json({
        success: false,
        error: 'No files found'
      }, { status: 404 });
    }

    // 4. 获取签字位置
    const { data: positions, error: positionsError } = await supabase
      .from('signature_positions')
      .select('*')
      .eq('recipient_id', recipient.id)
      .order('page_number');

    // 5. 更新查看状态
    if (recipient.status === 'pending') {
      await supabase
        .from('signature_recipients')
        .update({ 
          status: 'viewed',
          viewed_at: new Date().toISOString()
        })
        .eq('id', recipient.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        recipient: {
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          status: recipient.status,
          signed_at: recipient.signed_at
        },
        task: recipient.signature_tasks,
        files: files.map(f => ({
          id: f.id,
          name: f.display_name,
          url: f.original_file_url,
          order: f.file_order
        })),
        positions: positions || []
      }
    });

  } catch (error) {
    console.error('Error in GET /api/public/sign:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error'
    }, { status: 500 });
  }
}

// POST - 更新签字
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    const body = await request.json();
    const { positionId, value } = body;

    // 1. 验证token
    const { data: recipient, error: recipientError } = await supabase
      .from('signature_recipients')
      .select('id, status, expires_at')
      .eq('token', token)
      .single();

    if (recipientError || !recipient) {
      return NextResponse.json({
        success: false,
        error: 'Invalid token'
      }, { status: 404 });
    }

    // 2. 检查token是否过期
    if (new Date(recipient.expires_at) < new Date()) {
      return NextResponse.json({
        success: false,
        error: 'Token expired'
      }, { status: 410 });
    }

    // 3. 更新签字位置
    const { error: updateError } = await supabase
      .from('signature_positions')
      .update({
        signature_content: value,
        status: 'signed',
        signed_at: new Date().toISOString()
      })
      .eq('id', positionId)
      .eq('recipient_id', recipient.id);

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update signature'
      }, { status: 500 });
    }

    // 4. 检查是否所有位置都已签名
    const { data: pendingPositions } = await supabase
      .from('signature_positions')
      .select('id')
      .eq('recipient_id', recipient.id)
      .eq('status', 'pending');

    // 5. 如果所有位置都已签名，更新收件人状态
    if (!pendingPositions || pendingPositions.length === 0) {
      await supabase
        .from('signature_recipients')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString()
        })
        .eq('id', recipient.id);
    }

    return NextResponse.json({
      success: true,
      message: 'Signature updated successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/public/sign:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error'
    }, { status: 500 });
  }
}