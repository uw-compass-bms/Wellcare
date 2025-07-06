"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Play } from 'lucide-react';
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
  
  // 计算是否有文件需要处理
  const hasUploadedFiles = Object.values(documents).some(doc => doc.cached || doc.uploaded);
  const hasPendingFiles = Object.values(documents).some(doc => doc.cached && !doc.uploaded);
  
  // 如果没有上传文件，不显示面板
  if (!hasUploadedFiles) return null;
  
  // 如果所有文档都已处理完成，隐藏面板
  if (hasUploadedFiles && !hasPendingFiles && !isProcessing) return null;

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
    return "Ready to process documents";
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Intelligent Document Processing</CardTitle>
        <CardDescription>
          {isProcessing ? getProcessingDescription() : "Automatically detects and processes single/multi-file documents using AI analysis"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 智能文档处理按钮 */}
        <div className="flex justify-center">
          <Button 
            onClick={onProcessDocuments}
            disabled={isProcessing || !hasPendingFiles}
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
                Process All Documents
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 