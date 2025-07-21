import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Token is required'
      }, { status: 400 });
    }

    // 查询收件人信息
    const { data: recipient, error: recipientError } = await supabase
      .from('signature_recipients')
      .select(`
        id,
        task_id,
        name,
        email,
        status,
        expires_at,
        signature_tasks!inner(
          id,
          title,
          description,
          status,
          user_id
        )
      `)
      .eq('token', token)
      .single();

    if (recipientError || !recipient) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired token'
      }, { status: 404 });
    }

    // 检查token是否过期
    const now = new Date();
    const expiresAt = new Date(recipient.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({
        success: false,
        error: 'Token has expired'
      }, { status: 410 });
    }

    // 检查收件人状态
    if (recipient.status === 'signed') {
      return NextResponse.json({
        success: false,
        error: 'This document has already been signed',
        alreadySigned: true
      }, { status: 400 });
    }

    // 检查任务状态
    if (recipient.signature_tasks.status === 'completed') {
      return NextResponse.json({
        success: false,
        error: 'This task has been completed'
      }, { status: 400 });
    }

    // 获取文件列表
    const { data: files, error: filesError } = await supabase
      .from('signature_files')
      .select('*')
      .eq('task_id', recipient.task_id)
      .order('file_order');

    if (filesError || !files || files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No files found for this task'
      }, { status: 404 });
    }

    // 获取该收件人需要填写的字段
    const { data: fields, error: fieldsError } = await supabase
      .from('signature_positions')
      .select('*')
      .eq('recipient_id', recipient.id)
      .order('page_number', { ascending: true });

    // 更新收件人的查看时间
    if (!recipient.viewed_at) {
      await supabase
        .from('signature_recipients')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', recipient.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        recipient: {
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          status: recipient.status
        },
        task: {
          id: recipient.signature_tasks.id,
          title: recipient.signature_tasks.title,
          description: recipient.signature_tasks.description
        },
        files: files.map(file => ({
          id: file.id,
          name: file.display_name || file.original_filename,
          url: file.original_file_url,
          order: file.file_order
        })),
        fields: fields || [],
        expiresAt: recipient.expires_at
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to verify token'
    }, { status: 500 });
  }
}