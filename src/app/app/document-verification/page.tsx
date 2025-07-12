"use client";
import { PageHeader } from '@/components/ui/page-header';
import { useDocumentExtraction } from './hooks/useDocumentExtraction';
import { DocumentUploadSection } from './components/DocumentUploadSection';
import { ProcessingButton } from './components/ProcessingButton';
import { ResultsSection } from './components/ResultsSection';

export default function DocumentVerification() {
  const {
    // 状态
    multiFiles,
    singleFiles,
    isProcessing,
    processedResults,
    
    // 计算值
    stats,
    hasResults,
    
    // 方法
    setMultiFiles,
    setSingleFiles,
    handleProcessAllFiles
  } = useDocumentExtraction();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 页面标题 */}
      <PageHeader
        title="Document Extraction"
        description="Upload insurance-related documents and extract key information using AI technology"
      />

      {/* 文件上传区域 */}
      <DocumentUploadSection
        multiFiles={multiFiles}
        singleFiles={singleFiles}
        onMultiFilesChange={(type, files) => {
          setMultiFiles(prev => ({
            ...prev,
            [type]: files
          }));
        }}
        onSingleFileChange={(type, fileData) => {
          setSingleFiles(prev => ({
            ...prev,
            [type]: fileData
          }));
        }}
      />

      {/* 处理按钮 */}
      <ProcessingButton
        isProcessing={isProcessing}
        totalFiles={stats.totalFiles}
        pendingFiles={stats.pendingFiles}
        onProcessAllFiles={handleProcessAllFiles}
      />

      {/* 提取结果区域 */}
      <ResultsSection
        processedResults={processedResults}
        hasResults={hasResults}
      />
    </div>
  );
} 