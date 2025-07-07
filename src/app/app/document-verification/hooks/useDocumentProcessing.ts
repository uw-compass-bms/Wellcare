import { useState } from 'react';
import { DocumentType, DocumentState, CachedFileWithId } from '../types';
import { DocumentService } from '../services/documentService';

export function useDocumentProcessing() {
  // Document state management
  const [documents, setDocuments] = useState<Record<DocumentType, DocumentState>>({
    mvr: { 
      data: null, 
      loading: false, 
      error: null, 
      uploaded: false, 
      cached: false, 
      cachedFile: null,
      // 初始为单文件模式，上传文件后自动切换到多文件模式
      isMultiFile: false,
      multiFileState: {
        files: {},
        processingFiles: new Set(),
        processedFiles: new Set(),
        errors: {}
      }
    },
    autoplus: { 
      data: null, 
      loading: false, 
      error: null, 
      uploaded: false, 
      cached: false, 
      cachedFile: null,
      // 初始为单文件模式，上传文件后自动切换到多文件模式
      isMultiFile: false,
      multiFileState: {
        files: {},
        processingFiles: new Set(),
        processedFiles: new Set(),
        errors: {}
      }
    },
    quote: { data: null, loading: false, error: null, uploaded: false, cached: false, cachedFile: null },
    application: { data: null, loading: false, error: null, uploaded: false, cached: false, cachedFile: null }
  });
  
  // Batch processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<DocumentType | null>(null);

  // 支持多文件的文档类型
  const MULTI_FILE_TYPES: DocumentType[] = ['mvr', 'autoplus'];

  // Handle file caching (upload only, no processing)
  const handleFileUpload = async (file: File, type: DocumentType) => {
    // 检查是否是支持多文件的类型，如果是，自动切换到多文件模式
    const shouldSwitchToMultiFile = MULTI_FILE_TYPES.includes(type);
    
    if (shouldSwitchToMultiFile) {
      // 切换到多文件模式并添加文件
      await handleMultiFileUpload([file], type);
      return;
    }

    // 单文件模式的原有逻辑
    setDocuments(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true, error: null }
    }));

    try {
      // Create cached file
      const cachedFile = await DocumentService.createCachedFile(file);

      setDocuments(prev => ({
        ...prev,
        [type]: { 
          ...prev[type], 
          loading: false, 
          error: null, 
          cached: true,
          cachedFile: cachedFile,
          // Reset extraction state when new file uploaded
          uploaded: false,
          data: null
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

  // 处理多文件上传（MVR和AutoPlus使用）
  const handleMultiFileUpload = async (files: File[], type: DocumentType = 'mvr') => {
    
    // 清除之前的错误
    setDocuments(prev => ({
      ...prev,
      [type]: { 
        ...prev[type], 
        error: null,
        uploaded: false,
        data: null
      }
    }));

    for (const file of files) {
      try {
        const cachedFileWithId = await DocumentService.createCachedFileWithId(file);

        setDocuments(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            cached: true,
            // 切换到多文件模式
            isMultiFile: true,
            multiFileState: {
              ...prev[type].multiFileState!,
              files: {
                ...prev[type].multiFileState!.files,
                [cachedFileWithId.fileId]: cachedFileWithId
              }
            }
          }
        }));

      } catch (err) {
        console.error(`文件 ${file.name} 上传失败:`, err);
        setDocuments(prev => ({
          ...prev,
          [type]: {
            ...prev[type],
            error: `文件 ${file.name} 上传失败: ${err instanceof Error ? err.message : '未知错误'}`
          }
        }));
      }
    }
  };

  // 删除多文件（MVR和AutoPlus使用）
  const handleMultiFileDelete = (fileId: string, type: DocumentType) => {
    setDocuments(prev => {
      const newFiles = { ...prev[type].multiFileState!.files };
      delete newFiles[fileId];
      
      const newProcessingFiles = new Set(prev[type].multiFileState!.processingFiles);
      newProcessingFiles.delete(fileId);
      
      const newProcessedFiles = new Set(prev[type].multiFileState!.processedFiles);
      newProcessedFiles.delete(fileId);
      
      const newErrors = { ...prev[type].multiFileState!.errors };
      delete newErrors[fileId];

      return {
        ...prev,
        [type]: {
          ...prev[type],
          cached: Object.keys(newFiles).length > 0,
          multiFileState: {
            files: newFiles,
            processingFiles: newProcessingFiles,
            processedFiles: newProcessedFiles,
            errors: newErrors
          }
        }
      };
    });
  };

  // 删除单文件（Quote和Application使用）
  const handleSingleFileDelete = (type: DocumentType) => {
    setDocuments(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        cached: false,
        uploaded: false,
        data: null,
        error: null,
        cachedFile: null
      }
    }));
  };

  // 统一的文件删除接口
  const handleFileDelete = (fileId: string | undefined, type: DocumentType) => {
    if (MULTI_FILE_TYPES.includes(type) && fileId) {
      // 多文件删除
      handleMultiFileDelete(fileId, type);
    } else {
      // 单文件删除
      handleSingleFileDelete(type);
    }
  };

  // Process single document
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

  // Validate all extracted documents (local business rules)
  const validateDocuments = () => {
    // This will trigger re-rendering of BusinessRulesValidation component
    // which automatically validates all uploaded documents
    // No additional logic needed here as validation is reactive
    console.log('Validation triggered for all extracted documents');
  };

  // 智能处理所有文档（单文件 + 多文件）
  const processDocuments = async () => {
    setIsProcessing(true);

    try {
      // 1. 处理MVR多文件（如果存在）
      if (documents.mvr.isMultiFile && documents.mvr.multiFileState && 
          Object.keys(documents.mvr.multiFileState.files).length > 0 && 
          !documents.mvr.uploaded) {
        setProcessingStep('mvr');
        console.log('Processing MVR multi-files...');
        await processMultiFiles('mvr');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 2. 处理Auto+多文件（如果存在）
      if (documents.autoplus.isMultiFile && documents.autoplus.multiFileState && 
          Object.keys(documents.autoplus.multiFileState.files).length > 0 && 
          !documents.autoplus.uploaded) {
        setProcessingStep('autoplus');
        console.log('Processing Auto+ multi-files...');
        await processMultiFiles('autoplus');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 3. 处理其他单文件文档
      const singleFileDocuments = Object.entries(documents).filter(
        ([, state]) => {
          // 单文件文档：有缓存文件但未上传，且不是多文件模式
          return state.cached && !state.uploaded && state.cachedFile && !state.isMultiFile;
        }
      );

      for (const [type, state] of singleFileDocuments) {
        if (state.cachedFile) {
          setProcessingStep(type as DocumentType);
          console.log(`Processing single ${type} document...`);
          await processDocument(type as DocumentType);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // 4. 处理完成，触发验证
      setProcessingStep(null);
      validateDocuments();
      console.log('All documents processed successfully!');

    } catch (error) {
      console.error("Document processing error:", error);
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  // 处理多文件提取（MVR和AutoPlus使用）
  const processMultiFiles = async (docType: DocumentType = 'mvr') => {
    const multiState = documents[docType].multiFileState!;
    const filesList = Object.values(multiState.files);
    
    if (filesList.length === 0) return;

    // 设置处理状态
    setDocuments(prev => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        loading: true,
        error: null
      }
    }));

    try {
      // 构建多文件API请求
      const filesData = filesList.map(file => ({
        fileId: file.fileId,
        fileName: file.fileName,
        b64data: file.b64data
      }));

      // 标记所有文件为处理中
      setDocuments(prev => ({
        ...prev,
        [docType]: {
          ...prev[docType],
          multiFileState: {
            ...prev[docType].multiFileState!,
            processingFiles: new Set(filesList.map(f => f.fileId)),
            errors: {} // 清除之前的错误
          }
        }
      }));

      // 调用多文件API
      const apiEndpoint = docType === 'mvr' 
        ? '/api/document-extraction/mvr' 
        : '/api/document-extraction/autoplus';
      
      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: filesData })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '多文件处理失败');
      }

      // 更新处理状态
      setDocuments(prev => ({
        ...prev,
        [docType]: {
          ...prev[docType],
          data: result.data,
          loading: false,
          uploaded: true,
          multiFileState: {
            ...prev[docType].multiFileState!,
            processingFiles: new Set(),
            processedFiles: new Set(filesList.map(f => f.fileId)),
            errors: result.metadata?.errors ? 
              Object.fromEntries(result.metadata.errors.map((e: {fileId: string; error: string}) => [e.fileId, e.error])) : {}
          }
        }
      }));

    } catch (err) {
      // 处理失败，清除处理状态
      setDocuments(prev => ({
        ...prev,
        [docType]: {
          ...prev[docType],
          loading: false,
          error: err instanceof Error ? err.message : '多文件处理失败',
          multiFileState: {
            ...prev[docType].multiFileState!,
            processingFiles: new Set()
          }
        }
      }));
    }
  };

  return {
    documents,
    isProcessing,
    processingStep,
    handleFileUpload,
    processDocuments,
    // 多文件相关功能
    handleMultiFileUpload,
    handleFileDelete
  };
} 