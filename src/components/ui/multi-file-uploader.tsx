import * as React from "react";
import { useCallback } from "react";
import { LucideIcon, Upload, FileText, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { IconCard, ColorTheme } from "./icon-card";
import { cn } from "@/lib/utils";

// 文件状态类型
type FileStatus = 'pending' | 'processed' | 'error';

// 上传文件接口
export interface UploadedFile {
  id: string;
  file: File;
  status: FileStatus;
  lastModified: number;
  error?: string;
  // 处理标记，用于判断是否需要重新处理
  needsProcessing?: boolean;
}

interface MultiFileUploaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: ColorTheme;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  className?: string;
}

export function MultiFileUploader({
  title,
  description, 
  icon,
  color,
  files,
  onFilesChange,
  className
}: MultiFileUploaderProps) {
  // 生成唯一文件ID
  const generateFileId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = Array.from(selectedFiles).map(file => ({
      id: generateFileId(),
      file,
      status: 'pending',
      lastModified: file.lastModified,
      needsProcessing: true
    }));

    onFilesChange([...files, ...newFiles]);
    
    // 清空input，允许重新选择相同文件
    event.target.value = '';
  }, [files, onFilesChange, generateFileId]);

  // 删除文件
  const removeFile = useCallback((fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId));
  }, [files, onFilesChange]);

  // 统计数据
  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processedCount = files.filter(f => f.status === 'processed').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="text-center pb-3">
        <div className="flex justify-center mb-2">
          <IconCard 
            icon={icon}
            title=""
            color={color}
            size="md"
          />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
        
        {/* 文件统计 */}
        {files.length > 0 && (
          <div className="flex justify-center gap-2 text-xs mt-2">
            <span className="text-gray-600">Total: {files.length}</span>
            {processedCount > 0 && <span className="text-green-600">Done: {processedCount}</span>}
            {pendingCount > 0 && <span className="text-yellow-600">Pending: {pendingCount}</span>}
            {errorCount > 0 && <span className="text-red-600">Errors: {errorCount}</span>}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* 文件上传区域 */}
        <div className="text-center">
          <input
            type="file"
            id={`multi-upload-${title.toLowerCase().replace(/\s+/g, '-')}`}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
            onChange={handleFileSelect}
          />
                      <Button
              onClick={() => document.getElementById(`multi-upload-${title.toLowerCase().replace(/\s+/g, '-')}`)?.click()}
              variant="outline"
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Add Files
            </Button>
        </div>

        {/* 文件列表 */}
        {files.length > 0 && (
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {files.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center justify-between p-1.5 border rounded bg-gray-50"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {uploadedFile.file.name}
                  </span>
                  
                  {/* 状态指示器 */}
                  <div className="flex-shrink-0">
                    {uploadedFile.status === 'processed' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {uploadedFile.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    {uploadedFile.status === 'pending' && (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                </div>
                
                {/* 删除按钮 */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFile(uploadedFile.id)}
                  className="flex-shrink-0 ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 错误信息显示 */}
        {files.some(f => f.error) && (
          <div className="space-y-1">
            {files.filter(f => f.error).map(file => (
              <div key={file.id} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                <strong>{file.file.name}:</strong> {file.error}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 