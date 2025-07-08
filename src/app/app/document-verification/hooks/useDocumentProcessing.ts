import { useState } from 'react';
import { DocumentType, DocumentState } from '../types';
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
  
  // Data extraction state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<DocumentType | null>(null);

  // Validation state - 新增验证相关状态
  const [isValidating, setIsValidating] = useState(false);
  const [validationStep, setValidationStep] = useState<string | null>(null);
  const [hasValidated, setHasValidated] = useState(false);
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});
  const [validationKey, setValidationKey] = useState(0);

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
        
        // 添加文件状态信息
        const fileWithStatus = {
          ...cachedFileWithId,
          isProcessed: false,
          lastModified: file.lastModified,
          extractedData: null,
          error: undefined
        };

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
                [fileWithStatus.fileId]: fileWithStatus
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

      // 如果没有文件了，重置整个状态
      const hasFiles = Object.keys(newFiles).length > 0;

      return {
        ...prev,
        [type]: {
          ...prev[type],
          cached: hasFiles,
          uploaded: hasFiles ? prev[type].uploaded : false,
          data: hasFiles ? prev[type].data : null,
          multiFileState: {
            files: newFiles,
            processingFiles: newProcessingFiles,
            processedFiles: newProcessedFiles,
            errors: newErrors
          }
        }
      };
    });

    // 如果还有其他文件，重新合并数据
    setTimeout(() => {
      setDocuments(prev => {
        const remainingFiles = Object.keys(prev[type].multiFileState?.files || {}).filter(id => id !== fileId);
        if (remainingFiles.length > 0) {
          mergeMultiFileData(type);
        }
        return prev;
      });
    }, 100);
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
  // 智能处理所有文档（单文件 + 多文件）- 仅数据提取，不包含验证
  const processDocuments = async () => {
    setIsProcessing(true);

    try {
      // 1. 处理MVR文件（支持多文件和单文件）
      if (documents.mvr.isMultiFile && documents.mvr.multiFileState && 
          Object.keys(documents.mvr.multiFileState.files).length > 0) {
        setProcessingStep('mvr');
        console.log('Processing MVR files...');
        await processMultiFiles('mvr');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 2. 处理Auto+文件（支持多文件和单文件）
      if (documents.autoplus.isMultiFile && documents.autoplus.multiFileState && 
          Object.keys(documents.autoplus.multiFileState.files).length > 0) {
        setProcessingStep('autoplus');
        console.log('Processing Auto+ files...');
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

      // 4. 数据提取完成
      setProcessingStep(null);
      console.log('All documents processed successfully! Ready for validation.');

    } catch (error) {
      console.error("Document processing error:", error);
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  // 验证所有已提取的文档数据 - 新的独立验证函数
  const validateDocuments = async () => {
    // 检查是否有已提取的数据
    const hasExtractedData = Object.values(documents).some(doc => doc.data && doc.uploaded);
    
    if (!hasExtractedData) {
      console.warn('No extracted data found. Please extract document data first.');
      return;
    }

    setIsValidating(true);
    setValidationStep('Initializing validation...');
    
    try {
      console.log('Starting business rules validation...');
      
      // 重置之前的验证结果
      setValidationResults({});
      setHasValidated(false);
      
      // 递增validationKey以触发所有验证组件重新验证
      setValidationKey(prev => prev + 1);
      
      // 这里不需要实际的API调用，因为验证逻辑在 BusinessRulesValidation 组件中
      // 我们只需要设置状态来触发组件重新验证
      setValidationStep('Running business rules...');
      
      // 模拟验证过程的延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasValidated(true);
      console.log('Business rules validation initiated successfully!');
      
    } catch (error) {
      console.error("Validation error:", error);
    } finally {
      setIsValidating(false);
      setValidationStep(null);
    }
  };

  // 处理单个文件（多文件中的一个文件）
  const processSingleFileInMulti = async (fileId: string, docType: DocumentType) => {
    const multiState = documents[docType].multiFileState!;
    const file = multiState.files[fileId];
    
    if (!file) return;

    // 标记该文件为处理中
    setDocuments(prev => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        multiFileState: {
          ...prev[docType].multiFileState!,
          processingFiles: new Set([...prev[docType].multiFileState!.processingFiles, fileId]),
          files: {
            ...prev[docType].multiFileState!.files,
            [fileId]: {
              ...prev[docType].multiFileState!.files[fileId],
              error: undefined
            }
          }
        }
      }
    }));

    try {
      console.log(`Processing individual file: ${file.fileName} (${fileId})`);
      
      // 调用单文件API（POST方法）
      const apiEndpoint = docType === 'mvr' 
        ? '/api/document-extraction/mvr' 
        : '/api/document-extraction/autoplus';
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          b64data: file.b64data,
          fileName: file.fileName,
          fileSize: file.fileSize,
          fileType: file.fileType
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'File processing failed');
      }

      // 更新文件状态为已处理
      setDocuments(prev => ({
        ...prev,
        [docType]: {
          ...prev[docType],
          multiFileState: {
            ...prev[docType].multiFileState!,
            processingFiles: new Set([...prev[docType].multiFileState!.processingFiles].filter(id => id !== fileId)),
            processedFiles: new Set([...prev[docType].multiFileState!.processedFiles, fileId]),
            files: {
              ...prev[docType].multiFileState!.files,
              [fileId]: {
                ...prev[docType].multiFileState!.files[fileId],
                isProcessed: true,
                extractedData: result.data,
                error: undefined
              }
            }
          }
        }
      }));

      console.log(`Successfully processed file: ${file.fileName}`);
      return result.data;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Error processing file ${file.fileName}:`, errorMessage);
      
      // 更新文件错误状态
      setDocuments(prev => ({
        ...prev,
        [docType]: {
          ...prev[docType],
          multiFileState: {
            ...prev[docType].multiFileState!,
            processingFiles: new Set([...prev[docType].multiFileState!.processingFiles].filter(id => id !== fileId)),
            files: {
              ...prev[docType].multiFileState!.files,
              [fileId]: {
                ...prev[docType].multiFileState!.files[fileId],
                isProcessed: false,
                error: errorMessage
              }
            }
          }
        }
      }));
      
      throw err;
    }
  };

  // 处理多文件提取（MVR和AutoPlus使用） - 修改为逐个处理
  const processMultiFiles = async (docType: DocumentType = 'mvr') => {
    const multiState = documents[docType].multiFileState!;
    const filesList = Object.values(multiState.files);
    
    if (filesList.length === 0) return;

    // 只处理未处理的文件或有错误需要重试的文件
    const filesToProcess = filesList.filter(file => 
      !file.isProcessed || file.error
    );

    if (filesToProcess.length === 0) {
      console.log('All files already processed, skipping...');
      // 如果所有文件都已处理，只需要合并数据
      await mergeMultiFileData(docType);
      return;
    }

    console.log(`Processing ${filesToProcess.length} files out of ${filesList.length} total files`);

    // 设置整体处理状态
    setDocuments(prev => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        loading: true,
        error: null
      }
    }));

    const processedResults = [];
    let hasErrors = false;

    // 逐个处理文件
    for (const file of filesToProcess) {
      try {
        const result = await processSingleFileInMulti(file.fileId, docType);
        processedResults.push(result);
        
        // 在文件之间添加延迟，避免API限制
        if (filesToProcess.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        hasErrors = true;
        console.error(`Failed to process file ${file.fileName}:`, error);
      }
    }

    // 合并所有已处理文件的数据
    await mergeMultiFileData(docType);

    // 更新整体状态
    setDocuments(prev => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        loading: false,
        uploaded: !hasErrors, // 只有在没有错误时才标记为已上传
        error: hasErrors ? 'Some files failed to process' : null
      }
    }));
  };

  // 合并多文件数据
  const mergeMultiFileData = async (docType: DocumentType) => {
    setDocuments(prev => {
      const multiState = prev[docType].multiFileState!;
      const processedFiles = Object.values(multiState.files).filter(file => 
        file.isProcessed && file.extractedData
      );

      if (processedFiles.length === 0) {
        return prev;
      }

      // 构建多文件数据结构
      const extractedDataList = processedFiles.map(file => ({
        ...file.extractedData,
        file_name: file.fileName,
        file_id: file.fileId
      }));

      const multiData = {
        // 使用第一个成功记录的基本信息作为默认值
        ...extractedDataList[0],
        // 多文件记录
        records: extractedDataList
      };

      // 更新合并后的数据
      return {
        ...prev,
        [docType]: {
          ...prev[docType],
          data: multiData
        }
      };
    });
  };

  // 重新处理单个文件
  const reprocessSingleFile = async (fileId: string, type: DocumentType) => {
    if (!MULTI_FILE_TYPES.includes(type)) return;
    
    const file = documents[type].multiFileState?.files[fileId];
    if (!file) return;

    console.log(`Reprocessing single file: ${file.fileName}`);
    
    // 重置文件状态
    setDocuments(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        multiFileState: {
          ...prev[type].multiFileState!,
          files: {
            ...prev[type].multiFileState!.files,
            [fileId]: {
              ...prev[type].multiFileState!.files[fileId],
              isProcessed: false,
              error: undefined,
              extractedData: null
            }
          }
        }
      }
    }));

    try {
      await processSingleFileInMulti(fileId, type);
      await mergeMultiFileData(type);
    } catch (error) {
      console.error(`Failed to reprocess file ${file.fileName}:`, error);
    }
  };

  // 重新处理单文档（Quote和Application使用）
  const reprocessSingleDocument = async (type: DocumentType) => {
    const cachedFile = documents[type].cachedFile;
    if (!cachedFile) return;

    console.log(`Reprocessing single document: ${type}`);
    
    // 重置文档状态，保留缓存文件
    setDocuments(prev => ({
      ...prev,
      [type]: { 
        ...prev[type], 
        loading: true, 
        error: null,
        uploaded: false,
        data: null
      }
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
    } catch (err) {
      setDocuments(prev => ({
        ...prev,
        [type]: { 
          ...prev[type],
          loading: false, 
          error: err instanceof Error ? err.message : "Processing failed"
        }
      }));
    }
  };

  return {
    documents,
    // Data extraction state
    isProcessing,
    processingStep,
    // Validation state
    isValidating,
    validationStep,
    hasValidated,
    validationResults,
    validationKey,
    // Functions
    handleFileUpload,
    processDocuments,
    validateDocuments,
    // 多文件相关功能
    handleMultiFileUpload,
    handleFileDelete,
    // 单文件重新处理
    reprocessSingleFile,
    // 单文档重新处理
    reprocessSingleDocument
  };
} 