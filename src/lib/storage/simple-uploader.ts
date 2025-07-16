/**
 * 简单文件上传工具
 * 遵循数据库设计：只需要上传文件并返回URL
 */

import { supabase, supabaseAdmin } from '@/lib/supabase/client'

// 简单的存储路径结构
export function generateFilePath(userId: string, taskId: string, filename: string): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `users/${userId}/tasks/${taskId}/${timestamp}_${sanitizedFilename}`
}

// 上传文件到Supabase storage (使用管理员客户端避免RLS)
export async function uploadFile(file: File, filePath: string): Promise<string> {
  // 使用管理员客户端上传，避免RLS限制
  const client = supabaseAdmin || supabase
  
  const { data, error } = await client.storage
    .from('signature-files')
    .upload(filePath, file)

  if (error) {
    throw new Error(`文件上传失败: ${error.message}`)
  }

  // 获取公开URL
  const { data: urlData } = supabase.storage
    .from('signature-files')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

// 删除文件
export async function deleteFile(filePath: string): Promise<void> {
  const client = supabaseAdmin || supabase
  
  const { error } = await client.storage
    .from('signature-files')
    .remove([filePath])

  if (error) {
    throw new Error(`文件删除失败: ${error.message}`)
  }
}

// 验证文件类型 (支持PDF和图片)
export function validateFileType(file: File): boolean {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif'
  ]
  return allowedTypes.includes(file.type)
}

// 验证文件大小 (最大10MB)
export function validateFileSize(file: File): boolean {
  const maxSize = 10 * 1024 * 1024 // 10MB
  return file.size <= maxSize
}

// 简单文件元数据提取
export interface FileMetadata {
  filename: string
  originalFilename: string
  fileSize: number
  mimeType: string
  extension: string
  isPDF: boolean
  isImage: boolean
}

export function extractFileMetadata(file: File): FileMetadata {
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  
  return {
    filename: file.name,
    originalFilename: file.name,
    fileSize: file.size,
    mimeType: file.type,
    extension: extension,
    isPDF: file.type === 'application/pdf',
    isImage: file.type.startsWith('image/')
  }
} 