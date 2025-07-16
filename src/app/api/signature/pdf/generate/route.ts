/**
 * PDF生成API
 * POST /api/signature/pdf/generate - 生成最终签字PDF
 * 集成所有PDF处理模块，生成包含签字的最终PDF文档
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/middleware';
import { 
  createPDFProcessor,
  SignatureElement 
} from '@/lib/pdf';
import { createSignatureComposer } from '@/lib/pdf/signature-composer';
import { supabaseAdmin, supabase } from '@/lib/supabase/client';
import { generateFilePath } from '@/lib/storage/simple-uploader';

// 请求接口
export interface PDFGenerateRequest {
  taskId: string;              // 签字任务ID
  fileId: string;              // 原始PDF文件ID
  signatures: SignatureElement[]; // 签字元素数组
  outputFileName?: string;     // 输出文件名（可选）
  options?: {
    embedMode?: 'overlay' | 'merge'; // 嵌入模式
    quality?: 'high' | 'medium' | 'low'; // 输出质量
    preserveMetadata?: boolean;  // 是否保留原始PDF元数据
    enableDebug?: boolean;       // 是否启用调试模式
  };
}

// 响应接口
export interface PDFGenerateResponse {
  success: boolean;
  data?: {
    fileId: string;           // 生成的PDF文件ID
    fileName: string;         // 文件名
    fileSize: number;         // 文件大小（字节）
    downloadUrl: string;      // 下载URL
    supabaseUrl: string;      // Supabase存储URL
    signatureCount: number;   // 嵌入的签字数量
    processingTime: number;   // 处理时间（毫秒）
    metadata: {
      taskId: string;
      originalFileId: string;
      generatedAt: string;
      version: string;
    };
  };
  error?: string;
  message?: string;
  details?: any;
}

/**
 * POST /api/signature/pdf/generate
 * 生成包含签字的最终PDF
 */
export async function POST(request: NextRequest): Promise<NextResponse<PDFGenerateResponse>> {
  const startTime = Date.now();
  
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

    // 2. 解析请求体
    let requestData: PDFGenerateRequest;
    try {
      requestData = await request.json();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request',
        message: 'Failed to parse request body'
      }, { status: 400 });
    }

    // 3. 验证必需字段
    const { taskId, fileId, signatures } = requestData;
    if (!taskId || !fileId || !signatures || !Array.isArray(signatures)) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'taskId, fileId, and signatures array are required'
      }, { status: 400 });
    }

    if (signatures.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No signatures provided',
        message: 'At least one signature element is required'
      }, { status: 400 });
    }

    // 4. 初始化PDF处理器和签字合成器
    const pdfProcessor = createPDFProcessor();
    const signatureComposer = createSignatureComposer({
      enableValidation: true,
      enableRetry: true,
      maxRetryAttempts: 3,
      enableProgressCallback: false,
      enableBatchOptimization: true,
      embedConfig: {
        debugMode: requestData.options?.enableDebug || false
      }
    });

    // 5. 实现PDF生成核心逻辑
    console.log(`Starting PDF generation for task ${taskId} with ${signatures.length} signatures`);

    // 构建Supabase URL
    const supabaseBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseUrl = `${supabaseBaseUrl}/storage/v1/object/public/signature-files/${fileId}`;

    // 5.1 分析PDF文档结构
    let analysisResult;
    try {
      analysisResult = await pdfProcessor.analyzeDocument(supabaseUrl);
      console.log(`PDF analysis completed: ${analysisResult.documentInfo.pageCount} pages`);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'PDF analysis failed',
        message: `Failed to analyze PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 400 });
    }

    // 5.2 准备文档进行签字处理
    let preparedResult;
    try {
      preparedResult = await pdfProcessor.prepareForSigning(supabaseUrl);
      console.log(`Document prepared for signing: ${preparedResult.isReady ? 'Ready' : 'Not ready'}`);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Document preparation failed',
        message: `Failed to prepare document: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 400 });
    }

    // 5.3 使用签字合成器嵌入所有签字
    let compositionResult;
    try {
      compositionResult = await signatureComposer.composeSignatures(
        preparedResult.preparedDocument,
        signatures
      );
      console.log(`Composition result: ${compositionResult.processedElements} processed, ${compositionResult.successfulEmbeds} successful`);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Signature composition failed',
        message: `Failed to compose signatures: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 400 });
    }

    if (!compositionResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Signature composition failed',
        message: 'Failed to embed signatures into PDF',
        details: {
          processedElements: compositionResult.processedElements || 0,
          failedEmbeds: compositionResult.failedEmbeds || 0,
          errors: compositionResult.errors || []
        }
      }, { status: 400 });
    }

    // 5.4 生成最终PDF字节数据
    const finalPdfBytes = await preparedResult.preparedDocument.document.save();
    
    // 5.5 上传生成的PDF到Supabase存储
    const outputFileName = requestData.outputFileName || `signed-${taskId}-${Date.now()}.pdf`;
    const filePath = generateFilePath(authResult.userId!, taskId, outputFileName);
    
    console.log(`Uploading PDF to Supabase: ${filePath}`);
    
    let uploadedFileUrl: string;
    try {
      // 使用管理员客户端上传PDF字节数据
      const client = supabaseAdmin || supabase;
      
      const { data, error } = await client.storage
        .from('signature-files')
        .upload(filePath, finalPdfBytes, {
          contentType: 'application/pdf',
          upsert: false // 不覆盖现有文件
        });

      if (error) {
        throw new Error(`File upload failed: ${error.message}`);
      }

      // 获取公开URL
      const { data: urlData } = supabase.storage
        .from('signature-files')
        .getPublicUrl(data.path);

      uploadedFileUrl = urlData.publicUrl;
      console.log(`PDF uploaded successfully: ${uploadedFileUrl}`);
      
    } catch (error) {
      console.error('PDF upload error:', error);
      return NextResponse.json({
        success: false,
        error: 'File storage failed',
        message: `Failed to store generated PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      }, { status: 500 });
    }

    // 5.6 生成下载URL（使用Supabase的signed URL或public URL）
    let downloadUrl: string;
    try {
      // 生成有效期为1小时的签名URL
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('signature-files')
        .createSignedUrl(filePath, 3600); // 1小时有效期

      if (signedUrlError) {
        console.warn('Failed to create signed URL, using public URL:', signedUrlError);
        downloadUrl = uploadedFileUrl; // 回退到公开URL
      } else {
        downloadUrl = signedUrlData.signedUrl;
      }
    } catch (error) {
      console.warn('Error creating download URL, using upload URL:', error);
      downloadUrl = uploadedFileUrl;
    }
    
    const processingTime = Date.now() - startTime;
    const generatedFileId = `pdf-${taskId}-${Date.now()}`;
    
    console.log(`PDF generation completed in ${processingTime}ms`);
    console.log(`Generated PDF size: ${finalPdfBytes.length} bytes`);
    console.log(`Successfully embedded ${compositionResult.successfulEmbeds} signatures`);
    console.log(`File stored at: ${filePath}`);

    return NextResponse.json({
      success: true,
      data: {
        fileId: generatedFileId,
        fileName: outputFileName,
        fileSize: finalPdfBytes.length,
        downloadUrl: downloadUrl,
        supabaseUrl: uploadedFileUrl,
        signatureCount: compositionResult.successfulEmbeds || signatures.length,
        processingTime,
        metadata: {
          taskId,
          originalFileId: fileId,
          generatedAt: new Date().toISOString(),
          version: '1.0.0'
        }
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('PDF generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to generate PDF',
      details: {
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
} 