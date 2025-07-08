"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckSquare, FileCheck } from 'lucide-react';
import { DocumentType, DocumentState } from '../types';

interface ProcessingControlPanelProps {
  documents: Record<DocumentType, DocumentState>;
  isProcessing: boolean;
  processingStep: DocumentType | null;
  isValidating: boolean;
  validationStep: string | null;
  hasValidated: boolean;
  onProcessDocuments: () => void;
  onValidateDocuments: () => void;
}

export default function ProcessingControlPanel({ 
  documents, 
  isProcessing, 
  processingStep,
  isValidating,
  validationStep,
  hasValidated,
  onProcessDocuments,
  onValidateDocuments
}: ProcessingControlPanelProps) {
  
  // 计算是否有文件需要处理
  const hasUploadedFiles = Object.values(documents).some(doc => doc.cached || doc.uploaded);
  const hasPendingFiles = Object.values(documents).some(doc => doc.cached && !doc.uploaded);
  const hasExtractedData = Object.values(documents).some(doc => doc.data && doc.uploaded);
  
  // 如果没有上传文件，不显示面板
  if (!hasUploadedFiles) return null;
  
  // 获取处理状态描述
  const getProcessingDescription = () => {
    if (isProcessing && processingStep) {
      const stepNames: Record<DocumentType, string> = {
        mvr: 'MVR',
        autoplus: 'Auto+',
        quote: 'Quote',
        application: 'Application'
      };
      return `Extracting data from ${stepNames[processingStep]}...`;
    }
    if (isValidating && validationStep) {
      return validationStep;
    }
    if (hasExtractedData && !hasValidated) {
      return "Data extracted successfully. Ready for validation.";
    }
    if (hasValidated) {
      return "Validation completed. View results below.";
    }
    return "Upload documents and extract data using AI analysis";
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Document Processing & Validation</CardTitle>
        <CardDescription>
          {getProcessingDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Extract Data Button */}
          <Button 
            onClick={onProcessDocuments}
            disabled={isProcessing || isValidating || !hasPendingFiles}
            size="lg"
            className="min-w-[200px]"
            variant={hasExtractedData ? "outline" : "default"}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <FileCheck className="w-5 h-5 mr-2" />
                Extract Data
              </>
            )}
          </Button>

          {/* Validate & Cross-Check Button */}
          {hasExtractedData && (
            <Button 
              onClick={onValidateDocuments}
              disabled={isProcessing || isValidating || !hasExtractedData}
              size="lg"
              className="min-w-[200px]"
              variant={hasValidated ? "outline" : "default"}
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckSquare className="w-5 h-5 mr-2" />
                  {hasValidated ? 'Re-validate' : 'Validate & Cross-Check'}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Status indicators */}
        {(isProcessing || isValidating) && (
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600">
              {isProcessing && processingStep && `Processing ${processingStep.toUpperCase()}...`}
              {isValidating && validationStep}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 