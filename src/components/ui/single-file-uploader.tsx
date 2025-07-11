import * as React from "react";
import { LucideIcon, Upload, CheckCircle, AlertCircle, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { IconCard, ColorTheme } from "./icon-card";
import { cn } from "@/lib/utils";

// 文件状态类型
type FileStatus = 'pending' | 'processed' | 'error';

// 单文件数据接口
export interface SingleFileData {
  file: File | null;
  status: FileStatus;
  lastModified?: number;
  error?: string;
  // 处理标记，用于判断是否需要重新处理
  needsProcessing?: boolean;
}

interface SingleFileUploaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: ColorTheme;
  fileData: SingleFileData;
  onFileChange: (fileData: SingleFileData) => void;
  className?: string;
}

export function SingleFileUploader({
  title,
  description, 
  icon,
  color,
  fileData,
  onFileChange,
  className
}: SingleFileUploaderProps) {
  const inputId = `single-upload-${title.toLowerCase().replace(/\s+/g, '-')}`;

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    onFileChange({
      file: selectedFile,
      status: 'pending',
      lastModified: selectedFile.lastModified,
      needsProcessing: true
    });
    
    // 清空input，允许重新选择相同文件
    event.target.value = '';
  };

  // 清除文件
  const clearFile = () => {
    onFileChange({
      file: null,
      status: 'pending',
      needsProcessing: false
    });
  };

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
      </CardHeader>
      
      <CardContent>
        {!fileData.file ? (
          // 文件上传区域
          <div className="text-center">
            <input
              type="file"
              id={inputId}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
            />
                          <Button
                onClick={() => document.getElementById(inputId)?.click()}
                className="w-full"
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload File
              </Button>
          </div>
        ) : (
          // 文件状态区域
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate flex-1 mr-2">{fileData.file.name}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFile}
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* 状态指示器 */}
            <div className="flex items-center justify-center py-2">
              {fileData.status === 'processed' && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="text-sm">Processing Complete</span>
                </div>
              )}
              {fileData.status === 'error' && (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="text-sm">Processing Failed</span>
                </div>
              )}
              {fileData.status === 'pending' && (
                <div className="flex items-center text-gray-600">
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full mr-2" />
                  <span className="text-sm">Pending Processing</span>
                </div>
              )}
            </div>

            {/* 错误信息显示 */}
            {fileData.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{fileData.error}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 