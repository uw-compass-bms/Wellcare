/**
 * 签名相关类型定义
 */

// 基础签名位置类型
export interface BaseSignaturePosition {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 前端使用的签名位置类型
export interface SignaturePositionData {
  key: string;
  type: string;
  pageNumber: number;
  xPosition: number;
  yPosition: number;
  width: number;
  height: number;
  widthPercent: number;
  heightPercent: number;
  pageWidth: number;
  pageHeight: number;
  recipientId?: string;
  scale?: number;
  zIndex?: number;
  options?: {
    fontSize?: number;
    fontColor?: string;
    placeholder?: string;
  };
}

// 后端使用的签名位置类型
export interface SignaturePosition extends BaseSignaturePosition {
  recipientId: string;
  fileId: string;
  placeholderText?: string;
  status?: 'pending' | 'signed';
}

// 签名类型
export type SignatureType = 'signature' | 'date' | 'text' | 'checkbox';

// 签名状态
export type SignatureStatus = 'pending' | 'signed' | 'rejected' | 'expired';

// 收件人信息
export interface RecipientInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

// 文件信息
export interface FileInfo {
  id: string;
  originalFilename: string;
  displayName: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
  supabaseUrl: string;
}

// 签名任务状态
export type TaskStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'; 