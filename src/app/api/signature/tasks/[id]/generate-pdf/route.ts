import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/middleware';
import { supabase } from '@/lib/supabase/client';
import { addSignaturesToPDF, fetchPDFFromURL, generateSignedPDFName } from '@/lib/pdf/pdf-generator';

/**
 * 生成签名后的PDF
 * GET /api/signature/tasks/[id]/generate-pdf
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 验证认证
    const authResult = await validateAuth();
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const taskId = params.id;

    // 2. 获取任务信息
    const { data: task, error: taskError } = await supabase
      .from('signature_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', authResult.userId!)
      .single();

    if (taskError || !task) {
      return NextResponse.json({
        success: false,
        error: 'Task not found'
      }, { status: 404 });
    }

    // 3. 获取文件列表
    const { data: files, error: filesError } = await supabase
      .from('signature_files')
      .select('*')
      .eq('task_id', taskId)
      .order('file_order');

    if (filesError || !files || files.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No files found'
      }, { status: 404 });
    }

    // 4. 获取所有签名位置和内容
    const { data: positions, error: positionsError } = await supabase
      .from('signature_positions')
      .select(`
        *,
        signature_recipients!inner(
          name,
          email
        )
      `)
      .eq('status', 'signed')
      .in('file_id', files.map(f => f.id));

    if (positionsError) {
      throw new Error('Failed to load signature positions');
    }

    // 5. 处理每个文件
    const processedFiles = [];

    for (const file of files) {
      // 获取该文件的所有签名
      const filePositions = positions?.filter(p => p.file_id === file.id) || [];
      
      if (filePositions.length === 0) {
        // 如果没有签名，直接使用原文件
        processedFiles.push({
          name: file.display_name,
          url: file.original_file_url,
          hasSignatures: false
        });
        continue;
      }

      // 下载原始PDF
      const pdfBytes = await fetchPDFFromURL(file.original_file_url);

      // 准备签名数据
      const signatures = filePositions.map(pos => ({
        pageNumber: pos.page_number,
        x: pos.x_percent,
        y: pos.y_percent,
        width: pos.width_percent,
        height: pos.height_percent,
        text: pos.signature_content || '',
        type: detectSignatureType(pos.placeholder_text)
      }));

      // 添加签名到PDF
      const signedPdfBytes = await addSignaturesToPDF(pdfBytes, signatures);

      // 生成文件名
      const signedFileName = generateSignedPDFName(file.display_name);

      processedFiles.push({
        name: signedFileName,
        bytes: signedPdfBytes,
        hasSignatures: true
      });
    }

    // 6. 如果只有一个文件，直接返回
    if (processedFiles.length === 1) {
      const file = processedFiles[0];
      
      if (!file.hasSignatures) {
        // 重定向到原始文件
        return NextResponse.redirect(file.url);
      }

      // 返回签名后的PDF
      return new NextResponse(file.bytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${file.name}"`,
        },
      });
    }

    // 7. 多文件情况，返回文件列表供前端处理
    return NextResponse.json({
      success: true,
      files: processedFiles.map(f => ({
        name: f.name,
        hasSignatures: f.hasSignatures,
        size: f.bytes ? f.bytes.length : 0
      })),
      message: 'Multiple files need to be downloaded separately'
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate PDF',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// 检测签名类型
function detectSignatureType(placeholder: string): any {
  const lower = placeholder.toLowerCase();
  if (lower.includes('date')) return 'date';
  if (lower.includes('email')) return 'email';
  if (lower.includes('name')) return 'name';
  if (lower.includes('initial')) return 'initials';
  if (lower.includes('text')) return 'text';
  return 'signature';
}