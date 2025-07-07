"use client";
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Upload, Clock, LucideIcon, Trash2, X } from 'lucide-react';
import { DocumentState, CachedFileWithId } from '../../types';

interface MultiFileUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
  onMultiFileUpload: (files: File[]) => Promise<void>;
  onFileDelete: (fileId: string) => void;
  title: string;
  description: string;
  icon: LucideIcon;
  inputId: string;
  acceptedFormats?: string;
}

export default function MultiFileUploader({ 
  documentState, 
  onFileUpload,
  onMultiFileUpload,
  onFileDelete,
  title,
  description,
  icon: Icon,
  inputId,
  acceptedFormats = ".pdf,.png,.jpg,.jpeg,.webp"
}: MultiFileUploaderProps) {
  
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 多文件状态
  const multiState = documentState.multiFileState;
  const fileList = Object.values(multiState?.files || {});
  const hasFiles = fileList.length > 0;
  const isLoading = documentState.loading || (multiState?.processingFiles.size || 0) > 0;
  const hasUploaded = documentState.uploaded;
  const hasError = !!documentState.error;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      onMultiFileUpload(Array.from(files));
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
      onMultiFileUpload(files);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 获取文件状态
  const getFileStatus = (file: CachedFileWithId) => {
    if (multiState?.errors[file.fileId]) return 'error';
    if (multiState?.processingFiles.has(file.fileId)) return 'processing';
    if (multiState?.processedFiles.has(file.fileId)) return 'processed';
    return 'uploaded';
  };

  const getFileStatusIcon = (file: CachedFileWithId) => {
    const status = getFileStatus(file);
    switch (status) {
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'processed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const getFileStatusColor = (file: CachedFileWithId) => {
    const status = getFileStatus(file);
    switch (status) {
      case 'processing':
        return 'border-blue-200 bg-blue-50';
      case 'processed':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  // 获取卡片样式
  const getCardStyles = () => {
    if (hasError) {
      return 'border-red-200 border-2';
    }
    if (hasUploaded) {
      return 'border-green-200 border-2';
    }
    if (isLoading) {
      return 'border-blue-300 border-2';
    }
    if (hasFiles) {
      return 'border-blue-200 border-2';
    }
    return 'border-gray-200';
  };

  // 获取图标样式
  const getIconStyles = () => {
    if (hasError) {
      return { bg: 'bg-red-50', color: 'text-red-600' };
    }
    if (hasUploaded) {
      return { bg: 'bg-green-50', color: 'text-green-600' };
    }
    if (isLoading) {
      return { bg: 'bg-blue-50', color: 'text-blue-600' };
    }
    if (hasFiles) {
      return { bg: 'bg-blue-50', color: 'text-blue-600' };
    }
    return { bg: 'bg-blue-50', color: 'text-blue-600' };
  };

  // 获取状态描述
  const getStatusDescription = () => {
    if (hasUploaded) return `${fileList.length} records extracted`;
    if (hasFiles) return `${fileList.length} files uploaded, ready for processing`;
    if (isLoading) return 'Processing files...';
    return `Upload multiple ${title.toLowerCase()}`;
  };

  // 获取按钮文本
  const getButtonText = () => {
    if (isLoading) return 'Processing...';
    return hasFiles ? 'Add More Files' : 'Upload Files';
  };

  const cardStyles = getCardStyles();
  const iconStyles = getIconStyles();

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
          {isLoading && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
          )}
          {hasUploaded && !isLoading && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          )}
          {hasFiles && !hasUploaded && !isLoading && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{fileList.length}</span>
            </div>
          )}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{getStatusDescription()}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 文件列表 */}
        {hasFiles && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Uploaded Files:</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {fileList.map((file) => (
                <div key={file.fileId} className={`flex items-center justify-between p-2 rounded-lg border ${getFileStatusColor(file)}`}>
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {getFileStatusIcon(file)}
                    <span className="text-sm font-medium truncate">{file.fileName}</span>
                    <span className="text-xs text-gray-500">
                      {(file.fileSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  {/* 删除按钮 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileDelete(file.fileId)}
                    disabled={multiState?.processingFiles.has(file.fileId)}
                    className="h-8 w-8 p-0 hover:bg-red-100"
                    title="Delete file"
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 文件错误信息 */}
        {multiState && Object.keys(multiState.errors).length > 0 && (
          <div className="space-y-1">
            {Object.entries(multiState.errors).map(([fileId, error]) => {
              const file = multiState.files[fileId];
              return (
                <div key={fileId} className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  <strong>{file?.fileName || 'Unknown file'}:</strong> {error}
                </div>
              );
            })}
          </div>
        )}

        {/* 全局错误信息 */}
        {documentState.error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {documentState.error}
          </div>
        )}

        {/* 拖拽提示区域 */}
        {isDragOver && (
          <div className="border-2 border-dashed border-blue-400 rounded-lg p-4 text-center bg-blue-50">
            <p className="text-sm text-blue-600">Drop files here to upload</p>
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
            multiple
            disabled={isLoading}
          />
          
          <Button 
            onClick={handleUploadClick}
            className="w-full"
            disabled={isLoading}
            variant="default"
          >
            <Upload className="w-4 h-4 mr-2" />
            {getButtonText()}
          </Button>
          
          <p className="text-xs text-gray-500">
            Drag & drop files here or click to browse
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 