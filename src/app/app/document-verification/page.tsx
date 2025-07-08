"use client";
import DocumentUploadSection from './components/DocumentUploadSection';
import ResultsSection from './components/ResultsSection';
import ProcessingControlPanel from './components/ProcessingControlPanel';
import { useDocumentProcessing } from './hooks/useDocumentProcessing';

export default function DocumentVerification() {
  // 使用自定义Hook管理所有文档处理逻辑
  const {
    documents,
    // Data extraction state
    isProcessing,
    processingStep,
    // Validation state
    isValidating,
    validationStep,
    hasValidated,
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
        onMultiFileUpload={(files, type) => handleMultiFileUpload(files, type)}
        onFileDelete={(fileId, type) => handleFileDelete(fileId, type)}
        onFileReprocess={(fileId, type) => reprocessSingleFile(fileId, type)}
        onSingleFileReprocess={(type) => reprocessSingleDocument(type)}
      />

      {/* 处理控制面板 */}
      <ProcessingControlPanel 
        documents={documents}
        isProcessing={isProcessing}
        processingStep={processingStep}
        isValidating={isValidating}
        validationStep={validationStep}
        hasValidated={hasValidated}
        onProcessDocuments={processDocuments}
        onValidateDocuments={validateDocuments}
      />

      {/* 结果展示区域 */}
      <ResultsSection 
        documents={documents} 
        isProcessing={isProcessing}
        processingStep={processingStep}
        isValidating={isValidating}
        validationStep={validationStep}
        hasValidated={hasValidated}
        validationKey={validationKey}
      />
    </div>
  );
} 