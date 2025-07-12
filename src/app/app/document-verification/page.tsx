"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { useDocumentExtraction } from './hooks/useDocumentExtraction';
import { DocumentUploadSection } from './components/DocumentUploadSection';
import { ProcessingButton } from './components/ProcessingButton';

export default function DocumentVerification() {
  const router = useRouter();
  const {
    // 状态
    multiFiles,
    singleFiles,
    isProcessing,
    processedResults,
    saveStatus,
    
    // 计算值
    stats,
    hasResults,
    
    // 方法
    setMultiFiles,
    setSingleFiles,
    handleProcessAllFiles
  } = useDocumentExtraction();

  // 自动跳转逻辑 - 当处理完成且有结果时跳转到 client-management
  useEffect(() => {
    if (hasResults && !isProcessing && saveStatus?.includes('✅')) {
      const timer = setTimeout(() => {
        router.push('/app/client-management');
      }, 2000); // 2秒后跳转，让用户看到成功消息
      
      return () => clearTimeout(timer);
    }
  }, [hasResults, isProcessing, saveStatus, router]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

      {/* Save status display */}
      {saveStatus && (
        <div className="mt-4 text-center">
          <div className={`inline-block px-4 py-2 rounded-md text-sm font-medium ${
            saveStatus.includes('✅') 
              ? 'bg-green-100 text-green-800'
              : saveStatus.includes('❌')
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {saveStatus}
          </div>
          {saveStatus.includes('✅') && (
            <div className="mt-2 text-xs text-gray-600">
              Redirecting to Client Management in 2 seconds...
            </div>
          )}
        </div>
      )}
    </div>
  );
} 