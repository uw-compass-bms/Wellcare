import { useState } from 'react';
import { UploadedFile } from '@/components/ui/multi-file-uploader';
import { SingleFileData } from '@/components/ui/single-file-uploader';
import { fileToBase64, calculateFileStats } from '../utils/fileUtils';

// 提取数据接口（通用结构）
interface ExtractedData {
  [key: string]: unknown;
}

export const useDocumentExtraction = () => {
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
    return calculateFileStats(singleFiles, multiFiles);
  };

  // 检查是否有提取结果
  const hasResults = Object.keys(processedResults).length > 0;

  return {
    // 状态
    multiFiles,
    singleFiles,
    isProcessing,
    processedResults,
    
    // 计算值
    stats: getTotalStats(),
    hasResults,
    
    // 方法
    setMultiFiles,
    setSingleFiles,
    handleProcessAllFiles
  };
}; 