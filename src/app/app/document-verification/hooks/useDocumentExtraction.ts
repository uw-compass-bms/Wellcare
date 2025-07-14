import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { UploadedFile } from '@/components/ui/multi-file-uploader';
import { SingleFileData } from '@/components/ui/single-file-uploader';
import { fileToBase64, calculateFileStats } from '../utils/fileUtils';
import { 
  createCase, 
  saveMVRDataBatchWithCase,
  saveAutoPlusDataWithCase,
  saveAutoPlusDataBatchWithCase,
  saveQuoteDataWithCase,
  saveApplicationDataWithCase,
  updateCaseDocuments,
  CaseRecord
} from '@/lib/supabase/client';
import { MvrData, AutoPlusData, QuoteData, ApplicationData, DocumentData } from '../types';

// 提取数据接口（通用结构）
interface ExtractedData {
  [key: string]: unknown;
}

export const useDocumentExtraction = (
  updateMode = false,
  selectedCase: CaseRecord | null = null
) => {
  const { user } = useUser();
  
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
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Auto-save document data to database (create new case or update existing case)
  const autoSaveDocumentData = async (
    documentType: 'mvr' | 'autoplus' | 'quote' | 'application',
    extractedData: DocumentData | DocumentData[]
  ) => {
    if (!user?.id) return;
    
    try {
      if (updateMode && selectedCase) {
        // 更新模式：覆盖现有Case中的文档
        setSaveStatus(`🔄 Updating ${documentType.toUpperCase()} data in ${selectedCase.case_number}...`);
        
        await updateCaseDocuments(selectedCase.id, documentType, extractedData);
        
        setSaveStatus(`✅ Successfully updated ${documentType.toUpperCase()} in ${selectedCase.case_number}!`);
        
        // Auto-redirect to client management page
        setTimeout(() => {
          window.location.href = '/app/client-management';
        }, 2000);
      } else {
        // 创建模式：创建新Case
        setSaveStatus(`Creating case and saving ${documentType.toUpperCase()} data...`);
        
        // Extract primary contact information from first record
        const dataArray = Array.isArray(extractedData) ? extractedData : [extractedData];
        const firstRecord = dataArray[0];
        const primaryContactName = firstRecord?.name || null;
        const primaryLicenceNumber = firstRecord?.licence_number || null;
        
        // Create a new case
        const newCase = await createCase(user.id, primaryContactName, primaryLicenceNumber);
        
        // Save data based on document type
        switch (documentType) {
          case 'mvr':
            if (Array.isArray(extractedData)) {
              await saveMVRDataBatchWithCase(user.id, newCase.id, extractedData as MvrData[]);
            } else {
              await saveMVRDataBatchWithCase(user.id, newCase.id, [extractedData as MvrData]);
            }
            break;
            
          case 'autoplus':
            if (Array.isArray(extractedData)) {
              await saveAutoPlusDataBatchWithCase(user.id, newCase.id, extractedData as AutoPlusData[]);
            } else {
              await saveAutoPlusDataWithCase(user.id, newCase.id, extractedData as AutoPlusData);
            }
            break;
            
          case 'quote':
            await saveQuoteDataWithCase(user.id, newCase.id, extractedData as QuoteData);
            break;
            
          case 'application':
            await saveApplicationDataWithCase(user.id, newCase.id, extractedData as ApplicationData);
            break;
        }
        
        setSaveStatus(`✅ Case ${newCase.case_number} created successfully!`);
        
        // Auto-redirect to client management page
        setTimeout(() => {
          window.location.href = '/app/client-management';
        }, 2000);
      }
    } catch (error) {
      console.error(`Failed to ${updateMode ? 'update' : 'create'} ${documentType} data:`, error);
      setSaveStatus(`❌ Failed to ${updateMode ? 'update' : 'create'} ${documentType} data`);
      
      // Clear error status after 5 seconds
      setTimeout(() => setSaveStatus(null), 5000);
    }
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

        // Auto-save to database for single file document types
        if (user?.id) {
          await autoSaveDocumentData(type, result.data);
        }

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

        // Auto-save to database for all document types
        if (user?.id) {
          await autoSaveDocumentData(type, result.data.records);
        }

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
    let hasProcessedFiles = false;
    
    try {
      // 处理单文件
      for (const [type, fileData] of Object.entries(singleFiles)) {
        if (fileData.file && fileData.needsProcessing) {
          await processSingleFile(fileData.file, type as 'quote' | 'application');
          hasProcessedFiles = true;
          // 添加延迟避免API限制
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // 处理多文件
      for (const [type, files] of Object.entries(multiFiles)) {
        if (files.some(f => f.needsProcessing)) {
          await processMultiFiles(files, type as 'mvr' | 'autoplus');
          hasProcessedFiles = true;
          // 添加延迟避免API限制
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // 所有文档类型现在都会自动保存并创建Case
      if (hasProcessedFiles) {
        console.log('All documents processed and saved automatically');
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
    saveStatus,
    
    // 计算值
    stats: getTotalStats(),
    hasResults,
    
    // 方法
    setMultiFiles,
    setSingleFiles,
    handleProcessAllFiles
  };
}; 