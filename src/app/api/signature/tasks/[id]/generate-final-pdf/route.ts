import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase/client';
import { SignatureElement } from '@/lib/pdf';

/**
 * 生成最终签名PDF
 * POST /api/signature/tasks/[id]/generate-final-pdf
 * 
 * 功能：
 * 1. 收集任务中所有已签名的数据
 * 2. 调用PDF生成API生成包含签名的PDF
 * 3. 保存生成的PDF URL到数据库
 * 4. 返回下载链接
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 验证用户认证（支持内部调用）
    let userId = null;
    
    // 优先使用Clerk认证
    const authResult = await auth();
    userId = authResult?.userId;
    
    // 如果没有Clerk认证，检查内部调用头
    if (!userId) {
      const internalUserId = request.headers.get('x-user-id');
      if (internalUserId) {
        console.log('Using internal user ID:', internalUserId);
        userId = internalUserId;
      }
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const taskId = resolvedParams.id;

    // 2. 验证任务归属和状态
    const { data: task, error: taskError } = await supabase
      .from('signature_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // 检查任务是否已完成
    if (task.status !== 'completed') {
      return NextResponse.json(
        { error: 'Task not completed. All recipients must sign first.' },
        { status: 400 }
      );
    }

    // 3. 获取所有文件
    const { data: files, error: filesError } = await supabase
      .from('signature_files')
      .select('*')
      .eq('task_id', taskId)
      .order('file_order');

    if (filesError || !files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files found for this task' },
        { status: 404 }
      );
    }

    // 4. 处理每个文件
    const generatedFiles = [];
    
    for (const file of files) {
      console.log(`Processing file: ${file.display_name}`);

      // 4.1 收集该文件的所有签名位置
      const { data: positions, error: positionsError } = await supabase
        .from('signature_positions')
        .select(`
          *,
          signature_recipients!inner(
            id,
            name,
            email
          )
        `)
        .eq('file_id', file.id)
        .eq('status', 'signed');

      if (positionsError) {
        console.error('Error fetching positions:', positionsError);
        continue;
      }

      // 4.2 转换为PDF生成所需的格式
      const signatures: SignatureElement[] = positions.map(pos => {
        // 根据字段类型设置样式
        const getFieldStyle = (fieldType: string) => {
          switch (fieldType) {
            case 'signature':
              return {
                fontFamily: 'Dancing Script',
                fontSize: 16,
                color: '#000080'
              };
            case 'date':
            case 'text':
            case 'name':
            case 'email':
            case 'number':
              return {
                fontFamily: 'Arial',
                fontSize: 12,
                color: '#000000'
              };
            default:
              return {
                fontFamily: 'Arial',
                fontSize: 12,
                color: '#000000'
              };
          }
        };

        return {
          recipientId: pos.recipient_id,
          pageNumber: pos.page_number,
          x: pos.x_percent,
          y: pos.y_percent,
          width: pos.width_percent,
          height: pos.height_percent,
          type: pos.field_type || 'signature',
          value: pos.signature_content || pos.default_value || '',
          style: getFieldStyle(pos.field_type || 'signature')
        };
      });

      console.log(`Found ${signatures.length} signatures for file ${file.id}`);

      // 4.3 调用PDF生成API
      const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/signature/pdf/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '' // 传递认证cookie
        },
        body: JSON.stringify({
          taskId: taskId,
          fileId: file.id,
          signatures: signatures,
          outputFileName: `signed-${file.display_name}`,
          options: {
            embedMode: 'overlay',
            quality: 'high',
            preserveMetadata: true
          }
        })
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        console.error('PDF generation failed:', errorData);
        continue;
      }

      const pdfResult = await generateResponse.json();
      
      // 4.4 更新文件记录
      await supabase
        .from('signature_files')
        .update({
          final_file_url: pdfResult.data.supabaseUrl,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', file.id);

      generatedFiles.push({
        fileId: file.id,
        fileName: file.display_name,
        originalUrl: file.original_file_url,
        signedUrl: pdfResult.data.supabaseUrl,
        downloadUrl: pdfResult.data.downloadUrl,
        signatureCount: pdfResult.data.signatureCount
      });
    }

    // 5. 返回结果
    return NextResponse.json({
      success: true,
      message: `Generated ${generatedFiles.length} signed PDF files`,
      data: {
        taskId: taskId,
        taskTitle: task.title,
        files: generatedFiles,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating final PDFs:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate PDFs',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}