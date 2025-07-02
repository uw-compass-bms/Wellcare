"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, CheckCircle, Loader2, FileText } from 'lucide-react';
import { DocumentType, DocumentState } from '../types';

interface ProcessingControlPanelProps {
  documents: Record<DocumentType, DocumentState>;
  isProcessing: boolean;
  processingStep: DocumentType | null;
  onProcessAllDocuments: () => void;
}

export default function ProcessingControlPanel({ 
  documents, 
  isProcessing, 
  processingStep, 
  onProcessAllDocuments 
}: ProcessingControlPanelProps) {
  
  // 计算缓存文档数量
  const cachedCount = Object.values(documents).filter(doc => doc.cached).length;
  const processedCount = Object.values(documents).filter(doc => doc.uploaded).length;

  // 如果没有缓存文档，不显示面板
  if (cachedCount === 0) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Processing Control</span>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>{cachedCount} file(s) uploaded, {processedCount} processed</span>
          </div>
        </CardTitle>
        <CardDescription>
          {isProcessing 
            ? `Processing documents... Current: ${processingStep?.toUpperCase() || 'Initializing'}`
            : `${cachedCount} document(s) ready for AI processing`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="text-sm text-gray-700">
              Ready to process: {Object.entries(documents)
                .filter(([_, state]) => state.cached)
                .map(([type, _]) => type.toUpperCase())
                .join(', ')}
            </div>
            {isProcessing && (
              <div className="text-sm text-blue-600">
                Processing will take approximately {cachedCount * 10}-{cachedCount * 15} seconds
              </div>
            )}
          </div>
          <Button 
            onClick={onProcessAllDocuments}
            disabled={isProcessing || cachedCount === 0}
            size="lg"
            className="min-w-[160px]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Process All Documents
              </>
            )}
          </Button>
        </div>

        {/* 处理进度显示 */}
        {isProcessing && (
          <div className="mt-4 pt-4 border-t">
            <div className="space-y-2">
              {Object.entries(documents).map(([type, state]) => {
                if (!state.cached) return null;
                
                const isCurrentlyProcessing = processingStep === type;
                const isCompleted = state.uploaded;
                
                return (
                  <div key={type} className="flex items-center space-x-3 text-sm">
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : isCurrentlyProcessing ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                    )}
                    <span className={`capitalize ${
                      isCompleted ? 'text-green-700' :
                      isCurrentlyProcessing ? 'text-blue-700' :
                      'text-gray-500'
                    }`}>
                      {type.replace('autoplus', 'Auto+')} Document
                    </span>
                    <span className={`text-xs ${
                      isCompleted ? 'text-green-600' :
                      isCurrentlyProcessing ? 'text-blue-600' :
                      'text-gray-400'
                    }`}>
                      {isCompleted ? 'Completed' :
                       isCurrentlyProcessing ? 'Processing...' :
                       'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 