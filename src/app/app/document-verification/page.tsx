"use client";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { DocumentData } from './types';
import { PageHeader } from '@/components/ui/page-header';
import { MultiFileUploader, UploadedFile } from '@/components/ui/multi-file-uploader';
import { SingleFileUploader, SingleFileData } from '@/components/ui/single-file-uploader';
import { Button } from '@/components/ui/button';
import { Play, Loader2 } from 'lucide-react';

// 提取数据接口（通用结构）
interface ExtractedData {
  [key: string]: unknown;
}

// 文档配置
const documentConfigs = [
  { 
    type: 'mvr' as const, 
    title: 'MVR Reports', 
    description: 'Motor Vehicle Records',
    icon: FileText,
    color: 'blue' as const,
    isMultiFile: true
  },
  { 
    type: 'autoplus' as const, 
    title: 'Auto+ Reports', 
    description: 'Insurance History',
    icon: FileText,
    color: 'green' as const,
    isMultiFile: true
  },
  { 
    type: 'quote' as const, 
    title: 'Quote Document', 
    description: 'Insurance Quote',
    icon: FileText,
    color: 'purple' as const,
    isMultiFile: false
  },
  { 
    type: 'application' as const, 
    title: 'Application Form', 
    description: 'OAF-1 Form',
    icon: FileText,
    color: 'orange' as const,
    isMultiFile: false
  }
];

export default function DocumentVerification() {
  // 多文件状态
  const [multiFiles, setMultiFiles] = useState<Record<'mvr' | 'autoplus', UploadedFile[]>>({
    mvr: [],
    autoplus: []
  });

  // 单文件状态
  const [singleFiles, setSingleFiles] = useState<Record<'quote' | 'application', SingleFileData>>({
    quote: { file: null, status: 'pending' },
    application: { file: null, status: 'pending' }
  });

  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResults, setProcessedResults] = useState<Record<string, ExtractedData | ExtractedData[]>>({});

  // 文件转换为base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 处理单个文件
  const processSingleFile = async (file: File, type: 'quote' | 'application') => {
    try {
      const base64 = await fileToBase64(file);
      
      const response = await fetch(`/api/document-extraction/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          b64data: base64,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // 更新文件状态
        setSingleFiles(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            status: 'processed',
            needsProcessing: false,
            error: undefined
          }
        }));

        // 保存处理结果
        setProcessedResults(prev => ({
          ...prev,
          [type]: result.data
        }));

        return true;
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      // 更新文件状态
      setSingleFiles(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          status: 'error',
          needsProcessing: false,
          error: error instanceof Error ? error.message : 'Processing failed'
        }
      }));
      return false;
    }
  };

  // 处理多文件
  const processMultiFiles = async (files: UploadedFile[], type: 'mvr' | 'autoplus') => {
    const filesToProcess = files.filter(f => f.needsProcessing);
    
    if (filesToProcess.length === 0) return true;

    try {
      // 准备文件数据
      const fileDataArray = await Promise.all(
        filesToProcess.map(async (uploadedFile) => ({
          b64data: await fileToBase64(uploadedFile.file),
          fileName: uploadedFile.file.name,
          fileId: uploadedFile.id,
          fileSize: uploadedFile.file.size
        }))
      );

      const response = await fetch(`/api/document-extraction/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: fileDataArray
        })
      });

      const result = await response.json();
      
      if (result.success && result.data.records) {
        // 更新文件状态
        setMultiFiles(prev => ({
          ...prev,
          [type]: prev[type].map(f => {
            if (f.needsProcessing) {
              return {
                ...f,
                status: 'processed',
                needsProcessing: false,
                error: undefined
              };
            }
            return f;
          })
        }));

        // 保存处理结果
        setProcessedResults(prev => ({
          ...prev,
          [type]: result.data.records
        }));

        return true;
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      // 更新文件状态
      setMultiFiles(prev => ({
        ...prev,
        [type]: prev[type].map(f => {
          if (f.needsProcessing) {
            return {
              ...f,
              status: 'error',
              needsProcessing: false,
              error: error instanceof Error ? error.message : 'Processing failed'
            };
          }
          return f;
        })
      }));
      return false;
    }
  };

  // 处理所有文件
  const handleProcessAllFiles = async () => {
    setIsProcessing(true);
    
    try {
      // 处理单文件
      for (const [type, fileData] of Object.entries(singleFiles)) {
        if (fileData.file && fileData.needsProcessing) {
          await processSingleFile(fileData.file, type as 'quote' | 'application');
          // 添加延迟避免API限制
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // 处理多文件
      for (const [type, files] of Object.entries(multiFiles)) {
        if (files.some(f => f.needsProcessing)) {
          await processMultiFiles(files, type as 'mvr' | 'autoplus');
          // 添加延迟避免API限制
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 计算统计数据
  const getTotalStats = () => {
    let totalFiles = 0;
    let pendingFiles = 0;
    let processedFiles = 0;
    let errorFiles = 0;

    // 统计单文件
    Object.values(singleFiles).forEach(fileData => {
      if (fileData.file) {
        totalFiles++;
        if (fileData.needsProcessing) pendingFiles++;
        if (fileData.status === 'processed') processedFiles++;
        if (fileData.status === 'error') errorFiles++;
      }
    });

    // 统计多文件
    Object.values(multiFiles).forEach(files => {
      files.forEach(f => {
        totalFiles++;
        if (f.needsProcessing) pendingFiles++;
        if (f.status === 'processed') processedFiles++;
        if (f.status === 'error') errorFiles++;
      });
    });

    return { totalFiles, pendingFiles, processedFiles, errorFiles };
  };

  const stats = getTotalStats();

  // 检查是否有提取结果
  const hasResults = Object.keys(processedResults).length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 页面标题 */}
      <PageHeader
        title="Document Extraction"
        description="Upload insurance-related documents and extract key information using AI technology"
      />

      {/* 文件上传区域 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Document Upload</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {documentConfigs.map((config) => {
            if (config.isMultiFile) {
              const files = multiFiles[config.type as 'mvr' | 'autoplus'];
              return (
                <MultiFileUploader
                  key={config.type}
                  title={config.title}
                  description={config.description}
                  icon={config.icon}
                  color={config.color}
                  files={files}
                  onFilesChange={(newFiles) => {
                    setMultiFiles(prev => ({
                      ...prev,
                      [config.type]: newFiles
                    }));
                  }}
                />
              );
            } else {
              const fileData = singleFiles[config.type as 'quote' | 'application'];
              return (
                <SingleFileUploader
                  key={config.type}
                  title={config.title}
                  description={config.description}
                  icon={config.icon}
                  color={config.color}
                  fileData={fileData}
                  onFileChange={(newFileData) => {
                    setSingleFiles(prev => ({
                      ...prev,
                      [config.type]: newFileData
                    }));
                  }}
                />
              );
            }
          })}
        </div>
        
        {/* 处理按钮 */}
        {stats.totalFiles > 0 && (
          <div className="flex justify-end mt-6">
            <Button
              onClick={handleProcessAllFiles}
              disabled={isProcessing || stats.pendingFiles === 0}
              className="px-8 py-2"
              size="lg"
              variant={stats.pendingFiles > 0 ? "default" : "secondary"}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  {stats.pendingFiles > 0 ? `Process ${stats.pendingFiles} Files` : 'All Files Processed'}
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* 提取结果区域 */}
      {hasResults && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center">Extraction Results</h2>
          
          {Object.entries(processedResults).map(([type, data]) => {
            const config = documentConfigs.find(c => c.type === type);
            if (!config) return null;

            return (
              <Card key={type} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <CardTitle className="flex items-center">
                    <config.icon className="w-5 h-5 mr-2 text-gray-700" />
                    {config.title} - Extracted Data
                    {Array.isArray(data) && ` (${data.length} files)`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <pre className="bg-white p-6 overflow-auto text-sm border-0 max-h-96">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
} 