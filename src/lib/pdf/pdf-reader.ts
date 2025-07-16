/**
 * PDF文件读取模块
 * 负责从Supabase存储读取PDF文件、文件验证和错误处理
 */

import { PDFDocument } from 'pdf-lib';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PDFProcessorError, PDFErrorCode } from './pdf-types';

interface PDFReaderConfig {
  useAdminClient?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export class PDFReader {
  private supabaseClient: SupabaseClient;
  private config: Required<PDFReaderConfig>;

  constructor(config: PDFReaderConfig = {}) {
    this.config = {
      useAdminClient: config.useAdminClient ?? false,
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000
    };

    // 根据配置选择合适的Supabase客户端
    if (this.config.useAdminClient) {
      this.supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    } else {
      this.supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
  }

  /**
   * 从Supabase URL读取PDF文档
   */
  async loadFromUrl(supabaseUrl: string): Promise<PDFDocument> {
    try {
      // 解析Supabase URL获取bucket和path
      const { bucket, path } = this.parseSupabaseUrl(supabaseUrl);
      
      // 下载文件数据
      const fileData = await this.downloadWithRetry(bucket, path);
      
      // 验证PDF格式
      this.validatePDFData(fileData);
      
      // 加载PDF文档
      const pdfDoc = await PDFDocument.load(fileData);
      
      return pdfDoc;
    } catch (error) {
      throw this.createProcessorError(error, 'Failed to load PDF from URL');
    }
  }

  /**
   * 从文件ID读取PDF文档（需要查询数据库获取URL）
   */
  async loadFromFileId(fileId: string): Promise<PDFDocument> {
    try {
      // 查询数据库获取文件信息
      const { data, error } = await this.supabaseClient
        .from('signature_files')
        .select('supabase_url')
        .eq('id', fileId)
        .single();

      if (error || !data) {
        throw new Error(`File not found: ${fileId}`);
      }

      // 使用URL加载PDF
      return await this.loadFromUrl(data.supabase_url);
    } catch (error) {
      throw this.createProcessorError(error, `Failed to load PDF from file ID: ${fileId}`);
    }
  }

  /**
   * 批量加载多个PDF文档
   */
  async loadMultipleFiles(supabaseUrls: string[]): Promise<PDFDocument[]> {
    const loadPromises = supabaseUrls.map(url => this.loadFromUrl(url));
    
    try {
      return await Promise.all(loadPromises);
    } catch (error) {
      throw this.createProcessorError(error, 'Failed to load multiple PDF files');
    }
  }

  /**
   * 解析Supabase URL获取bucket和path
   */
  private parseSupabaseUrl(url: string): { bucket: string; path: string } {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Supabase Storage URL format: /storage/v1/object/public/{bucket}/{path}
      if (pathParts[1] === 'storage' && pathParts[2] === 'v1' && pathParts[3] === 'object') {
        const bucket = pathParts[5]; // skip 'public'
        const path = pathParts.slice(6).join('/');
        return { bucket, path };
      }
      
      throw new Error('Invalid Supabase URL format');
    } catch {
      throw new Error(`Failed to parse Supabase URL: ${url}`);
    }
  }

  /**
   * 带重试机制的文件下载
   */
  private async downloadWithRetry(bucket: string, path: string): Promise<ArrayBuffer> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const { data, error } = await this.supabaseClient.storage
          .from(bucket)
          .download(path);

        if (error) {
          throw new Error(`Supabase download error: ${error.message}`);
        }

        if (!data) {
          throw new Error('No data received from Supabase');
        }

        return await data.arrayBuffer();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        }
      }
    }

    throw lastError || new Error('Download failed after retries');
  }

  /**
   * 验证PDF文件数据
   */
  private validatePDFData(data: ArrayBuffer): void {
    // 检查文件大小
    if (data.byteLength === 0) {
      throw new Error('PDF file is empty');
    }

    // 检查PDF文件头
    const uint8Array = new Uint8Array(data);
    const header = String.fromCharCode(...uint8Array.slice(0, 4));
    
    if (header !== '%PDF') {
      throw new Error('Invalid PDF file format');
    }
  }

  /**
   * 创建统一的处理器错误
   */
  private createProcessorError(originalError: unknown, message: string): PDFProcessorError {
    const error = originalError as Error;
    
    let errorCode: PDFErrorCode;
    
    if (error.message.includes('not found') || error.message.includes('404')) {
      errorCode = PDFErrorCode.FILE_NOT_FOUND;
    } else if (error.message.includes('Invalid PDF') || error.message.includes('format')) {
      errorCode = PDFErrorCode.INVALID_PDF;
    } else if (error.message.includes('Supabase')) {
      errorCode = PDFErrorCode.SUPABASE_ERROR;
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      errorCode = PDFErrorCode.NETWORK_ERROR;
    } else {
      errorCode = PDFErrorCode.LOAD_FAILED;
    }

    return {
      code: errorCode,
      message,
      details: error.message,
      originalError: error
    };
  }
}

/**
 * 工厂函数：创建PDF读取器实例
 */
export function createPDFReader(config?: PDFReaderConfig): PDFReader {
  return new PDFReader(config);
}

/**
 * 工具函数：验证PDF文件
 */
export async function validatePDFFile(supabaseUrl: string): Promise<boolean> {
  try {
    const reader = createPDFReader();
    await reader.loadFromUrl(supabaseUrl);
    return true;
  } catch {
    return false;
  }
} 