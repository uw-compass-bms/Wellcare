"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Trash2, RefreshCw, X, Clock, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { DocumentState, CachedFileWithId, MultiFileState } from '../../types';

interface MvrUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
  onMultiFileUpload?: (files: File[]) => Promise<void>;
  onFileDelete?: (fileId: string) => void;
  onFileReplace?: (fileId: string, newFile: File) => Promise<void>;
}

export default function MvrUploader({ 
  documentState, 
  onFileUpload,
  onMultiFileUpload,
  onFileDelete,
  onFileReplace
}: MvrUploaderProps) {
  const [replaceFileId, setReplaceFileId] = useState<string | null>(null);

  // 检查是否启用多文件模式
  const isMultiFileMode = documentState.isMultiFile && documentState.multiFileState;
  const multiState = documentState.multiFileState;

  // 如果不是多文件模式，使用原有的BaseUploader逻辑
  if (!isMultiFileMode) {
    return (
      <Card className={`hover:shadow-lg transition-shadow ${
        documentState.uploaded ? 'border-green-200 border-2' :
        documentState.cached ? 'border-blue-200 border-2' :
        documentState.error ? 'border-red-200 border-2' :
        'border-gray-200'
      }`}>
        <CardHeader className="text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 relative ${
            documentState.uploaded ? 'bg-green-50' :
            documentState.cached ? 'bg-blue-50' :
            documentState.error ? 'bg-red-50' :
            'bg-blue-50'
          }`}>
            <FileText className={`w-8 h-8 ${
              documentState.uploaded ? 'text-green-600' :
              documentState.cached ? 'text-blue-600' :
              documentState.error ? 'text-red-600' :
              'text-blue-600'
            }`} />
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
          <CardTitle className="text-lg">MVR Documents</CardTitle>
          <CardDescription>
            {documentState.uploaded ? 'Data extracted successfully' :
             documentState.cached ? 'Ready for extraction' :
             documentState.error ? 'Extraction failed' :
             'Driver Record Documents'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-3">
            <input
              type="file"
              id="mvr-upload"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload(file);
              }}
              disabled={documentState.loading}
            />
            <Button 
              asChild 
              className="w-full"
              disabled={documentState.loading}
              variant={documentState.uploaded || documentState.cached ? "outline" : "default"}
            >
              <label htmlFor="mvr-upload" className="cursor-pointer">
                <Upload className={`w-4 h-4 mr-2 ${documentState.loading ? 'animate-spin' : ''}`} />
                {documentState.loading ? 'Extracting...' :
                 documentState.uploaded ? 'Replace MVR Documents' :
                 documentState.cached ? 'Replace MVR Documents' :
                 'Upload MVR Documents'}
              </label>
            </Button>
            
            {documentState.error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {documentState.error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // 多文件模式UI
  const fileList = Object.values(multiState?.files || {});
  const hasFiles = fileList.length > 0;
  const isLoading = documentState.loading || (multiState?.processingFiles.size || 0) > 0;
  const hasUploaded = documentState.uploaded;
  const hasError = !!documentState.error;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      if (replaceFileId && onFileReplace) {
        // 替换单个文件
        const file = files[0];
        if (file) {
          onFileReplace(replaceFileId, file);
          setReplaceFileId(null);
        }
      } else if (onMultiFileUpload) {
        // 添加多个文件
        onMultiFileUpload(Array.from(files));
      }
    }
    event.target.value = '';
  };



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
        return <Clock className="w-4 h-4 text-orange-600" />;
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
        return 'border-orange-200 bg-orange-50';
    }
  };

  const getStatusStyles = () => {
    if (hasError) {
      return {
        border: 'border-red-200 border-2',
        bg: 'bg-red-50',
        iconColor: 'text-red-600'
      };
    }
    if (hasUploaded) {
      return {
        border: 'border-green-200 border-2',
        bg: 'bg-green-50',
        iconColor: 'text-green-600'
      };
    }
    if (hasFiles) {
      return {
        border: 'border-blue-200 border-2',
        bg: 'bg-blue-50',
        iconColor: 'text-blue-600'
      };
    }
    return {
      border: 'border-gray-200',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600'
    };
  };

  const statusStyles = getStatusStyles();

  return (
    <Card className={`hover:shadow-lg transition-shadow ${statusStyles.border}`}>
      <CardHeader className="text-center">
        <div className={`w-16 h-16 ${statusStyles.bg} rounded-full flex items-center justify-center mx-auto mb-4 relative`}>
          <FileText className={`w-8 h-8 ${statusStyles.iconColor}`} />
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
        <CardTitle className="text-lg">MVR Documents</CardTitle>
        <CardDescription>
          {hasUploaded ? `${fileList.length} MVR records extracted` :
           hasFiles ? `${fileList.length} files uploaded, ready for processing` :
           'Upload multiple MVR documents'}
        </CardDescription>
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
                  <div className="flex items-center space-x-1">
                    {/* 替换按钮 */}
                    {onFileReplace && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplaceFileId(file.fileId)}
                        disabled={multiState?.processingFiles.has(file.fileId)}
                        className="h-8 w-8 p-0"
                        title="Replace file"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </Button>
                    )}
                    {/* 删除按钮 */}
                    {onFileDelete && (
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
                    )}
                  </div>
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

        {/* 上传按钮区域 */}
        <div className="text-center space-y-3">
          <input
            type="file"
            id="mvr-multi-upload"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            multiple={!replaceFileId}
            disabled={isLoading}
          />
          
          {replaceFileId ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Select a file to replace: {multiState?.files[replaceFileId]?.fileName}
              </p>
              <div className="flex justify-center space-x-2">
                <Button asChild size="sm">
                  <label htmlFor="mvr-multi-upload" className="cursor-pointer">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Choose File
                  </label>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setReplaceFileId(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button asChild size="sm" disabled={isLoading}>
              <label htmlFor="mvr-multi-upload" className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                {hasFiles ? 'Add Files' : 'Upload Files'}
              </label>
            </Button>
          )}
          
          <p className="text-xs text-gray-500">
            Supports PDF, PNG, JPG, JPEG, and WebP files
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 