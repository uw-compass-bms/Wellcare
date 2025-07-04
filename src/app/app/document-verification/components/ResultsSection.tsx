"use client";
import React from 'react';
import { DocumentType, DocumentState } from '../types';
import ProcessedDataTabs from './results/ProcessedDataTabs';
import BusinessRulesValidation from './results/business-rules/BusinessRulesValidation';

interface ResultsSectionProps {
  documents: Record<DocumentType, DocumentState>;
}

export default function ResultsSection({ documents }: ResultsSectionProps) {
  // 检查是否有任何已上传的文档
  const hasUploadedDocuments = Object.values(documents).some(doc => doc.uploaded);
  
  if (!hasUploadedDocuments) return null;

  return (
    <div className="space-y-8">
      {/* 处理后数据标签页 */}
      <ProcessedDataTabs documents={documents} />
      
      {/* 业务规则验证 */}
      <BusinessRulesValidation documents={documents} />
    </div>
  );
} 