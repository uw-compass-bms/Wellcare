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
  // 多文件处理（MVR和AutoPlus）
  onProcessMultiFiles?: (type: DocumentType) => void;
}

export default function ProcessingControlPanel({ 
  documents, 
  isProcessing, 
  processingStep, 
  onProcessDocuments,
  onProcessMultiFiles
}: ProcessingControlPanelProps) {
  
  // 计算状态统计
  const uploadedCount = Object.values(documents).filter(doc => doc.cached || doc.uploaded).length;
  const processedCount = Object.values(documents).filter(doc => doc.uploaded).length;
  const pendingCount = Object.values(documents).filter(doc => doc.cached && !doc.uploaded).length;
  
  // 检查MVR多文件状态
  const mvrMultiFiles = documents.mvr.multiFileState ? Object.keys(documents.mvr.multiFileState.files).length : 0;
  const mvrHasMultiFiles = documents.mvr.isMultiFile && mvrMultiFiles > 0;
  const mvrIsProcessed = documents.mvr.uploaded;

  // 检查Auto+多文件状态
  const autoplusMultiFiles = documents.autoplus.multiFileState ? Object.keys(documents.autoplus.multiFileState.files).length : 0;
  const autoplusHasMultiFiles = documents.autoplus.isMultiFile && autoplusMultiFiles > 0;
  const autoplusIsProcessed = documents.autoplus.uploaded;

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
        {/* 多文件处理按钮 */}
        {((mvrHasMultiFiles && onProcessMultiFiles) || (autoplusHasMultiFiles && onProcessMultiFiles)) && (
          <div className="mb-4 space-y-4">
            {/* MVR 多文件处理 */}
            {mvrHasMultiFiles && onProcessMultiFiles && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">MVR Multi-File Processing</h4>
                    <p className="text-sm text-blue-700">
                      {mvrMultiFiles} MVR file(s) ready for batch processing
                    </p>
                  </div>
                  <Button 
                    onClick={() => onProcessMultiFiles && onProcessMultiFiles('mvr')}
                    disabled={isProcessing || mvrIsProcessed}
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    {documents.mvr.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing MVR...
                      </>
                    ) : mvrIsProcessed ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                        MVR Processed
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Process MVR Files
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Auto+ 多文件处理 */}
            {autoplusHasMultiFiles && onProcessMultiFiles && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-green-900">Auto+ Multi-File Processing</h4>
                    <p className="text-sm text-green-700">
                      {autoplusMultiFiles} Auto+ file(s) ready for batch processing
                    </p>
                  </div>
                  <Button 
                    onClick={() => onProcessMultiFiles && onProcessMultiFiles('autoplus')}
                    disabled={isProcessing || autoplusIsProcessed}
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-100"
                  >
                    {documents.autoplus.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing Auto+...
                      </>
                    ) : autoplusIsProcessed ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                        Auto+ Processed
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Process Auto+ Files
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 常规文档处理按钮 */}
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