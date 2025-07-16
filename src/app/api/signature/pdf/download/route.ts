/**
 * PDF下载API
 * GET /api/signature/pdf/download - 安全下载已签字的PDF文件
 * 支持文件权限验证、临时URL生成和访问控制
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/middleware';
import { supabase, supabaseAdmin } from '@/lib/supabase/client';

// 下载请求参数接口
export interface PDFDownloadParams {
  fileId?: string;           // PDF文件ID（支持原始文件或生成文件）
  taskId?: string;           // 任务ID（下载任务的最终PDF）
  type?: 'original' | 'signed'; // 文件类型：原始文件或签字后文件
  download?: 'true' | 'false';  // 是否强制下载（vs在浏览器中显示）
  expires?: string;          // 自定义过期时间（秒数）
}

// 下载响应接口
export interface PDFDownloadResponse {
  success: boolean;
  data?: {
    downloadUrl: string;      // 下载URL
    fileName: string;         // 文件名
    fileSize: number;         // 文件大小
    expiresAt: string;        // URL过期时间
    contentType: string;      // 文件类型
    isTemporary: boolean;     // 是否为临时URL
  };
  error?: string;
  message?: string;
  details?: any;
}

// 文件权限验证结果
interface FilePermissionResult {
  hasPermission: boolean;
  fileInfo?: {
    id: string;
    taskId: string;
    fileName: string;
    fileSize: number;
    fileUrl: string;
    ownerId: string;
  };
  error?: string;
}

/**
 * GET /api/signature/pdf/download
 * 安全下载PDF文件
 */
export async function GET(request: NextRequest): Promise<NextResponse<PDFDownloadResponse | Blob>> {
  try {
    // 1. 验证用户认证
    const authResult = await validateAuth();
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: authResult.error || 'Authentication required'
      }, { status: 401 });
    }

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url);
    const params: PDFDownloadParams = {
      fileId: searchParams.get('fileId') || undefined,
      taskId: searchParams.get('taskId') || undefined,
      type: (searchParams.get('type') as 'original' | 'signed') || 'signed',
      download: (searchParams.get('download') as 'true' | 'false') || 'false',
      expires: searchParams.get('expires') || undefined
    };

    // 3. 验证必需参数
    if (!params.fileId && !params.taskId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter',
        message: 'Either fileId or taskId must be provided'
      }, { status: 400 });
    }

    // 4. 验证文件权限
    const permissionResult = await validateFilePermission(
      authResult.userId!,
      params.fileId,
      params.taskId,
      params.type
    );

    if (!permissionResult.hasPermission) {
      return NextResponse.json({
        success: false,
        error: 'Access denied',
        message: permissionResult.error || 'You do not have permission to access this file'
      }, { status: 403 });
    }

    // 5. 生成安全下载URL或直接提供文件流
    const fileInfo = permissionResult.fileInfo!;
    const expiresInSeconds = params.expires ? parseInt(params.expires) : 3600; // 默认1小时
    const shouldDirectDownload = params.download === 'true';

    console.log(`Generating download for file: ${fileInfo.fileName} (${fileInfo.fileSize} bytes)`);
    console.log(`Download mode: ${shouldDirectDownload ? 'direct' : 'url'}, expires: ${expiresInSeconds}s`);

    if (shouldDirectDownload) {
      // 直接下载：从Supabase获取文件并返回文件流
      try {
        const downloadResult = await downloadFileFromSupabase(fileInfo.fileUrl, fileInfo.fileName);
        
        return new NextResponse(downloadResult.fileData, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Length': fileInfo.fileSize.toString(),
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileInfo.fileName)}"`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      } catch (error) {
        console.error('Direct download failed:', error);
        return NextResponse.json({
          success: false,
          error: 'Download failed',
          message: 'Failed to retrieve file for download'
        }, { status: 500 });
      }
    } else {
      // 返回临时签名URL
      try {
        const signedUrlResult = await generateSignedDownloadUrl(
          fileInfo.fileUrl,
          fileInfo.fileName,
          expiresInSeconds
        );

        return NextResponse.json({
          success: true,
          data: {
            downloadUrl: signedUrlResult.signedUrl,
            fileName: fileInfo.fileName,
            fileSize: fileInfo.fileSize,
            expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
            contentType: 'application/pdf',
            isTemporary: true
          }
        });
      } catch (error) {
        console.error('Signed URL generation failed:', error);
        return NextResponse.json({
          success: false,
          error: 'URL generation failed',
          message: 'Failed to generate download URL'
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('PDF download error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process download request',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}

/**
 * 验证用户对文件的访问权限
 */
async function validateFilePermission(
  userId: string,
  fileId?: string,
  taskId?: string,
  type: 'original' | 'signed' = 'signed'
): Promise<FilePermissionResult> {
  try {
    if (fileId) {
      // 通过文件ID验证权限
      const { data, error } = await supabase
        .from('signature_files')
        .select(`
          id,
          task_id,
          original_filename,
          file_size,
          original_file_url,
          final_file_url,
          tasks:signature_tasks!inner(user_id)
        `)
        .eq('id', fileId)
        .eq('tasks.user_id', userId)
        .single();

      if (error || !data) {
        return {
          hasPermission: false,
          error: 'File not found or access denied'
        };
      }

      const fileUrl = type === 'original' ? data.original_file_url : data.final_file_url;
      
      if (type === 'signed' && !fileUrl) {
        return {
          hasPermission: false,
          error: 'Signed file not available yet'
        };
      }

      return {
        hasPermission: true,
        fileInfo: {
          id: data.id,
          taskId: data.task_id,
          fileName: data.original_filename,
          fileSize: data.file_size,
          fileUrl: fileUrl!,
          ownerId: userId
        }
      };

    } else if (taskId) {
      // 通过任务ID查找最终签字文件
      const { data, error } = await supabase
        .from('signature_tasks')
        .select(`
          id,
          user_id,
          signature_files(
            id,
            original_filename,
            file_size,
            final_file_url
          )
        `)
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return {
          hasPermission: false,
          error: 'Task not found or access denied'
        };
      }

      // 查找有最终文件URL的文件
      const fileWithFinalUrl = data.signature_files.find(f => f.final_file_url);
      
      if (!fileWithFinalUrl) {
        return {
          hasPermission: false,
          error: 'No signed PDF available for this task'
        };
      }

      return {
        hasPermission: true,
        fileInfo: {
          id: fileWithFinalUrl.id,
          taskId: data.id,
          fileName: fileWithFinalUrl.original_filename,
          fileSize: fileWithFinalUrl.file_size,
          fileUrl: fileWithFinalUrl.final_file_url!,
          ownerId: data.user_id
        }
      };
    }

    return {
      hasPermission: false,
      error: 'Invalid parameters'
    };

  } catch (error) {
    console.error('Permission validation error:', error);
    return {
      hasPermission: false,
      error: 'Failed to validate permissions'
    };
  }
}

/**
 * 从Supabase下载文件数据
 */
async function downloadFileFromSupabase(fileUrl: string, fileName: string): Promise<{
  fileData: ArrayBuffer;
  contentType: string;
}> {
  try {
    // 解析Supabase URL获取bucket和path
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const bucket = pathParts[4]; // signature-files
    const filePath = pathParts.slice(5).join('/');

    console.log(`Downloading from Supabase: bucket=${bucket}, path=${filePath}`);

    // 使用管理员客户端下载文件
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      throw new Error(`Supabase download failed: ${error.message}`);
    }

    if (!data) {
      throw new Error('No file data received from Supabase');
    }

    // 将Blob转换为ArrayBuffer
    const arrayBuffer = await data.arrayBuffer();
    
    console.log(`Downloaded file: ${fileName}, size: ${arrayBuffer.byteLength} bytes`);

    return {
      fileData: arrayBuffer,
      contentType: data.type || 'application/pdf'
    };

  } catch (error) {
    console.error('File download error:', error);
    throw new Error(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 生成签名下载URL
 */
async function generateSignedDownloadUrl(
  fileUrl: string,
  fileName: string,
  expiresInSeconds: number
): Promise<{
  signedUrl: string;
  expiresAt: Date;
}> {
  try {
    // 解析Supabase URL获取bucket和path
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const bucket = pathParts[4]; // signature-files
    const filePath = pathParts.slice(5).join('/');

    console.log(`Generating signed URL: bucket=${bucket}, path=${filePath}, expires=${expiresInSeconds}s`);

    // 生成签名URL
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresInSeconds, {
        download: fileName // 设置下载文件名
      });

    if (error) {
      throw new Error(`Signed URL generation failed: ${error.message}`);
    }

    if (!data?.signedUrl) {
      throw new Error('No signed URL received from Supabase');
    }

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    
    console.log(`Generated signed URL: ${data.signedUrl}`);
    console.log(`URL expires at: ${expiresAt.toISOString()}`);

    return {
      signedUrl: data.signedUrl,
      expiresAt
    };

  } catch (error) {
    console.error('Signed URL generation error:', error);
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
} 