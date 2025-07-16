/**
 * PDF处理相关类型定义
 * 包含签字元素、PDF信息、页面信息等基础类型
 */

// 签字元素类型
export enum SignatureElementType {
  NAME = 'name',
  DATE = 'date', 
  TEXT = 'text'
}

// 签字元素接口
export interface SignatureElement {
  id: string;
  type: SignatureElementType;
  content: string;
  position: {
    x: number; // 百分比坐标 0-100
    y: number; // 百分比坐标 0-100
    width: number; // 百分比宽度
    height: number; // 百分比高度
  };
  pageIndex: number; // 页面索引，从0开始
  style: {
    fontSize: number;
    fontColor: string;
    fontFamily: string;
  };
  recipientId?: string; // 关联的收件人ID
}

// PDF页面信息
export interface PDFPageInfo {
  pageIndex: number;
  width: number; // 像素宽度
  height: number; // 像素高度
  rotation: number; // 页面旋转角度
}

// PDF文档信息
export interface PDFDocumentInfo {
  pageCount: number;
  pages: PDFPageInfo[];
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

// PDF文件信息
export interface PDFFileInfo {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  supabaseUrl: string;
  document: PDFDocumentInfo;
}

// PDF处理配置
export interface PDFProcessorConfig {
  cacheEnabled: boolean;
  maxCacheSize: number;
  defaultFontSize: number;
  defaultFontColor: string;
  defaultFontFamily: string;
}

// PDF处理结果
export interface PDFProcessingResult {
  success: boolean;
  fileInfo?: PDFFileInfo;
  error?: PDFProcessorError;
  processedAt: Date;
}

// PDF处理错误
export interface PDFProcessorError {
  code: PDFErrorCode;
  message: string;
  details?: string;
  originalError?: Error;
}

// 错误码枚举
export enum PDFErrorCode {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_PDF = 'INVALID_PDF',
  LOAD_FAILED = 'LOAD_FAILED',
  PARSE_FAILED = 'PARSE_FAILED',
  SUPABASE_ERROR = 'SUPABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// 坐标转换信息
export interface CoordinateTransform {
  fromPercent: (percentX: number, percentY: number, pageIndex: number) => { x: number; y: number };
  toPercent: (pixelX: number, pixelY: number, pageIndex: number) => { x: number; y: number };
  getPageDimensions: (pageIndex: number) => { width: number; height: number };
}

// PDF多文件处理接口
export interface MultiPDFOperation {
  files: PDFFileInfo[];
  operation: 'merge' | 'batch_process' | 'compare';
  outputFileName: string;
} 