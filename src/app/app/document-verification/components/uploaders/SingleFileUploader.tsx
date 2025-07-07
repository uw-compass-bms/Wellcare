"use client";
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Upload, LucideIcon, Trash2 } from 'lucide-react';
import { DocumentState } from '../../types';

interface SingleFileUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
  onFileDelete?: () => void;
  title: string;
  description: string;
  icon: LucideIcon;
  inputId: string;
  acceptedFormats?: string;
}

export default function SingleFileUploader({ 
  documentState, 
  onFileUpload,
  onFileDelete,
  title,
  description,
  icon: Icon,
  inputId,
  acceptedFormats = ".pdf,.png,.jpg,.jpeg,.webp"
}: SingleFileUploaderProps) {
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      onFileUpload(file);
    }
    event.target.value = '';
  };

  // 拖拽处理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      setUploadedFileName(file.name);
      onFileUpload(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 获取卡片样式
  const getCardStyles = () => {
    if (documentState.error) {
      return 'border-red-200 border-2';
    }
    if (documentState.uploaded) {
      return 'border-green-200 border-2';
    }
    if (documentState.loading) {
      return 'border-blue-300 border-2';
    }
    if (documentState.cached) {
      return 'border-blue-200 border-2';
    }
    return 'border-gray-200';
  };

  // 获取图标样式
  const getIconStyles = () => {
    if (documentState.error) {
      return { bg: 'bg-red-50', color: 'text-red-600' };
    }
    if (documentState.uploaded) {
      return { bg: 'bg-green-50', color: 'text-green-600' };
    }
    if (documentState.loading) {
      return { bg: 'bg-blue-50', color: 'text-blue-600' };
    }
    if (documentState.cached) {
      return { bg: 'bg-blue-50', color: 'text-blue-600' };
    }
    return { bg: 'bg-blue-50', color: 'text-blue-600' };
  };

  // 获取状态描述
  const getStatusDescription = () => {
    if (documentState.loading) return 'Extracting data...';
    if (documentState.uploaded) return 'Data extracted successfully';
    if (documentState.cached) return 'Ready for extraction';
    if (documentState.error) return 'Extraction failed';
    return description;
  };

  // 获取按钮文本
  const getButtonText = () => {
    if (documentState.loading) return 'Extracting...';
    return `Upload ${title}`;
  };

  const cardStyles = getCardStyles();
  const iconStyles = getIconStyles();
  const hasFile = documentState.uploaded || documentState.cached;

  return (
    <Card 
      className={`hover:shadow-lg transition-shadow ${cardStyles} ${
        isDragOver ? 'border-blue-400 bg-blue-50' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardHeader className="text-center">
        <div className={`w-16 h-16 ${iconStyles.bg} rounded-full flex items-center justify-center mx-auto mb-4 relative`}>
          <Icon className={`w-8 h-8 ${iconStyles.color}`} />
          {documentState.loading && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
          )}
          {documentState.uploaded && !documentState.loading && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{getStatusDescription()}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 已上传文件信息 */}
        {hasFile && uploadedFileName && (
          <div className="flex items-center justify-between p-2 rounded-lg border border-blue-200 bg-blue-50">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium truncate">{uploadedFileName}</span>
            </div>
            {/* 删除按钮 */}
            {onFileDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onFileDelete}
                disabled={documentState.loading}
                className="h-8 w-8 p-0 hover:bg-red-100"
                title="Delete file"
              >
                <Trash2 className="w-3 h-3 text-red-600" />
              </Button>
            )}
          </div>
        )}

        {/* 错误信息 */}
        {documentState.error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {documentState.error}
          </div>
        )}

        {/* 拖拽提示区域 */}
        {isDragOver && (
          <div className="border-2 border-dashed border-blue-400 rounded-lg p-4 text-center bg-blue-50">
            <p className="text-sm text-blue-600">Drop file here to upload</p>
          </div>
        )}

        {/* 上传按钮区域 */}
        <div className="text-center space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            id={inputId}
            className="hidden"
            accept={acceptedFormats}
            onChange={handleFileChange}
            disabled={documentState.loading}
          />
          
          <Button 
            onClick={handleUploadClick}
            className="w-full"
            disabled={documentState.loading}
            variant="default"
          >
            <Upload className="w-4 h-4 mr-2" />
            {getButtonText()}
          </Button>
          
          <p className="text-xs text-gray-500">
            Drag & drop file here or click to browse
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 