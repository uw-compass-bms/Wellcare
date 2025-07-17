/**
 * API响应类型定义
 */

// 基础响应接口
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

// 分页响应接口
export interface PaginatedResponse<T = any> extends APIResponse<T> {
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 文件操作响应
export interface FileOperationResponse extends APIResponse {
  fileInfo?: {
    id: string;
    name: string;
    size: number;
    url?: string;
    type?: string;
  };
}

// 签名操作响应
export interface SignatureOperationResponse extends APIResponse {
  signatureInfo?: {
    id: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    pageNumber: number;
    recipientId?: string;
  };
}

// 任务操作响应
export interface TaskOperationResponse extends APIResponse {
  taskInfo?: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}

// 错误响应状态码
export enum APIErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  PDF_PROCESSING_ERROR = 'PDF_PROCESSING_ERROR',
  EMAIL_ERROR = 'EMAIL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
} 