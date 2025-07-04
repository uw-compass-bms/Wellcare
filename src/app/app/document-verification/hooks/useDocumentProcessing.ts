import { useState } from 'react';
import { DocumentType, DocumentState } from '../types';
import { DocumentService } from '../services/documentService';

export function useDocumentProcessing() {
  // 文档状态管理
  const [documents, setDocuments] = useState<Record<DocumentType, DocumentState>>({
    mvr: { data: null, loading: false, error: null, uploaded: false, cached: false, cachedFile: null },
    autoplus: { data: null, loading: false, error: null, uploaded: false, cached: false, cachedFile: null },
    quote: { data: null, loading: false, error: null, uploaded: false, cached: false, cachedFile: null },
    application: { data: null, loading: false, error: null, uploaded: false, cached: false, cachedFile: null }
  });
  
  // 批处理状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<DocumentType | null>(null);

  // 处理文件缓存（仅上传，不处理）
  const handleFileUpload = async (file: File, type: DocumentType) => {
    setDocuments(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true, error: null }
    }));

    try {
      // 创建缓存文件
      const cachedFile = await DocumentService.createCachedFile(file);

      setDocuments(prev => ({
        ...prev,
        [type]: { 
          ...prev[type], 
          loading: false, 
          error: null, 
          cached: true,
          cachedFile: cachedFile
        }
      }));

    } catch (err) {
      setDocuments(prev => ({
        ...prev,
        [type]: { 
          ...prev[type], 
          loading: false, 
          error: err instanceof Error ? err.message : "File upload failed",
          cached: false,
          cachedFile: null
        }
      }));
    }
  };

  // 处理单个文档
  const processDocument = async (type: DocumentType) => {
    const cachedFile = documents[type].cachedFile;
    if (!cachedFile) return;

    setDocuments(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true, error: null }
    }));

    try {
      const data = await DocumentService.processDocument(type, cachedFile);
      setDocuments(prev => ({
        ...prev,
        [type]: { 
          ...prev[type],
          data: data, 
          loading: false, 
          error: null, 
          uploaded: true 
        }
      }));
      return data;
    } catch (err) {
      setDocuments(prev => ({
        ...prev,
        [type]: { 
          ...prev[type], 
          loading: false, 
          error: err instanceof Error ? err.message : "Network error, please try again" 
        }
      }));
      throw err;
    }
  };

  // 批量处理所有缓存的文档
  const handleProcessAllDocuments = async () => {
    const cachedDocuments = Object.entries(documents).filter(([, state]) => state.cached && state.cachedFile);
    
    if (cachedDocuments.length === 0) {
      return;
    }

    setIsProcessing(true);

    try {
      // 依次处理每个文档
      for (const [type, state] of cachedDocuments) {
        if (state.cachedFile) {
          setProcessingStep(type as DocumentType);
          await processDocument(type as DocumentType);
          
          // 添加小延迟避免API限制
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // 所有文档处理完成
      setProcessingStep(null);

    } catch (error) {
      console.error("Batch processing error:", error);
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  return {
    documents,
    isProcessing,
    processingStep,
    handleFileUpload,
    handleProcessAllDocuments
  };
} 