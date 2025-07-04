"use client";
import DocumentUploadSection from './components/DocumentUploadSection';
import ResultsSection from './components/ResultsSection';
import ProcessingControlPanel from './components/ProcessingControlPanel';
import { useDocumentProcessing } from './hooks/useDocumentProcessing';

export default function DocumentVerification() {
  // 使用自定义Hook管理所有文档处理逻辑
  const {
    documents,
    isProcessing,
    processingStep,
    handleFileUpload,
    handleProcessAllDocuments,
    processDocument,
    reprocessDocument,
    clearDocument
  } = useDocumentProcessing();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Document Verification</h1>
        <p className="mt-2 text-gray-600">Upload and cross-validate insurance documents using AI analysis</p>
      </div>

      {/* 文档上传区域 */}
      <DocumentUploadSection 
        documents={documents}
        onFileUpload={handleFileUpload}
      />

      {/* 处理控制面板 */}
      <ProcessingControlPanel 
        documents={documents}
        isProcessing={isProcessing}
        processingStep={processingStep}
        onProcessAllDocuments={handleProcessAllDocuments}
        onProcessDocument={processDocument}
        onReprocessDocument={reprocessDocument}
        onClearDocument={clearDocument}
      />

      {/* 结果展示区域 */}
      <ResultsSection documents={documents} />
    </div>
  );
} 