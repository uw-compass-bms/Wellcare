"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Loader2, Play } from 'lucide-react';
import { DocumentType, DocumentState } from '../types';

interface ProcessingControlPanelProps {
  documents: Record<DocumentType, DocumentState>;
  isProcessing: boolean;
  processingStep: DocumentType | null;
  onProcessDocuments: () => void;
}

export default function ProcessingControlPanel({ 
  documents, 
  isProcessing, 
  processingStep, 
  onProcessDocuments
}: ProcessingControlPanelProps) {
  
  // 计算状态统计
  const uploadedCount = Object.values(documents).filter(doc => doc.cached || doc.uploaded).length;
  const processedCount = Object.values(documents).filter(doc => doc.uploaded).length;
  const pendingCount = Object.values(documents).filter(doc => doc.cached && !doc.uploaded).length;

  // 如果没有上传文件，不显示面板
  if (uploadedCount === 0) return null;

  // 获取处理状态描述
  const getProcessingDescription = () => {
    if (isProcessing && processingStep) {
      const stepNames: Record<DocumentType, string> = {
        mvr: 'MVR',
        autoplus: 'Auto+',
        quote: 'Quote',
        application: 'Application'
      };
      return `Processing ${stepNames[processingStep]}...`;
    }
    return `${uploadedCount} files uploaded, ${processedCount} processed`;
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Document Processing</span>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <FileText className="w-4 h-4" />
              <span>{uploadedCount}</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{processedCount}</span>
            </div>
          </div>
        </CardTitle>
        <CardDescription>
          {getProcessingDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <Button 
            onClick={onProcessDocuments}
            disabled={isProcessing || pendingCount === 0}
            size="lg"
            className="min-w-[200px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Process Documents
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 