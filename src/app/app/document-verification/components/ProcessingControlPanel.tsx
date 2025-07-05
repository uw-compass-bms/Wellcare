"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, CheckCircle, Loader2, FileText, RotateCcw, Trash2, AlertCircle } from 'lucide-react';
import { DocumentType, DocumentState } from '../types';

interface ProcessingControlPanelProps {
  documents: Record<DocumentType, DocumentState>;
  isProcessing: boolean;
  processingStep: DocumentType | null;
  onProcessAllDocuments: () => void;
  onProcessDocument: (type: DocumentType) => Promise<void>;
  onReprocessDocument: (type: DocumentType) => Promise<void>;
  onClearDocument: (type: DocumentType) => void;
}

export default function ProcessingControlPanel({ 
  documents, 
  isProcessing, 
  processingStep, 
  onProcessAllDocuments,
  onProcessDocument,
  onReprocessDocument,
  onClearDocument
}: ProcessingControlPanelProps) {
  
  // Calculate document status statistics
  const cachedCount = Object.values(documents).filter(doc => doc.cached).length;
  const processedCount = Object.values(documents).filter(doc => doc.uploaded).length;
  const pendingCount = Object.values(documents).filter(doc => doc.cached && !doc.uploaded).length;
  const errorCount = Object.values(documents).filter(doc => doc.error).length;

  // Get documents with cached files
  const availableDocuments = Object.entries(documents).filter(([, state]) => state.cached || state.uploaded);

  // If no documents available, don't show panel
  if (availableDocuments.length === 0) return null;

  // Document type display name mapping
  const documentNames: Record<DocumentType, string> = {
    mvr: 'MVR',
    autoplus: 'Auto+',
    quote: 'Quote',
    application: 'Application'
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Document Processing Control Panel</span>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <FileText className="w-4 h-4" />
              <span>{cachedCount} Uploaded</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{processedCount} Processed</span>
            </div>
            {errorCount > 0 && (
              <div className="flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>{errorCount} Errors</span>
              </div>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          {isProcessing 
            ? `Processing documents... Current: ${processingStep ? documentNames[processingStep] : 'Initializing'}`
            : `${pendingCount} document(s) pending, ${processedCount} completed`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Batch processing button */}
          {pendingCount > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="space-y-1">
                <div className="text-sm font-medium text-blue-900">
                  Batch Processing ({pendingCount} pending documents)
                </div>
                <div className="text-xs text-blue-700">
                  Estimated time: {pendingCount * 10}-{pendingCount * 15} seconds
                </div>
              </div>
              <Button 
                onClick={onProcessAllDocuments}
                disabled={isProcessing || pendingCount === 0}
                size="sm"
                className="min-w-[120px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Process All
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Individual document management */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Individual Document Management</h4>
            
            {availableDocuments.map(([type, state]) => {
              const docType = type as DocumentType;
              const isCurrentlyProcessing = processingStep === docType;
              const isCompleted = state.uploaded;
              const hasError = !!state.error;
              
              return (
                <div key={type} className={`flex items-center justify-between p-3 rounded-lg border ${
                  hasError ? 'bg-red-50 border-red-200' :
                  isCompleted ? 'bg-green-50 border-green-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    {/* Status icon */}
                    {isCurrentlyProcessing ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    ) : hasError ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                    )}
                    
                    {/* Document information */}
                    <div className="space-y-1">
                      <div className={`text-sm font-medium ${
                        hasError ? 'text-red-700' :
                        isCompleted ? 'text-green-700' :
                        isCurrentlyProcessing ? 'text-blue-700' :
                        'text-gray-700'
                      }`}>
                        {documentNames[docType]} Document
                      </div>
                      <div className="text-xs text-gray-500">
                        {state.cachedFile?.fileName || 'No file'}
                      </div>
                      {hasError && (
                        <div className="text-xs text-red-600">
                          Error: {state.error}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center space-x-2">
                    {!isCompleted && !isCurrentlyProcessing && state.cached && (
                      <Button
                        onClick={() => onProcessDocument(docType)}
                        disabled={isProcessing}
                        size="sm"
                        variant="outline"
                        className="min-w-[80px]"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Process
                      </Button>
                    )}
                    
                    {isCompleted && !isCurrentlyProcessing && (
                      <Button
                        onClick={() => onReprocessDocument(docType)}
                        disabled={isProcessing}
                        size="sm"
                        variant="outline"
                        className="min-w-[80px]"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Reprocess
                      </Button>
                    )}
                    
                    {!isCurrentlyProcessing && (
                      <Button
                        onClick={() => onClearDocument(docType)}
                        disabled={isProcessing}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Processing indicator */}
          {isProcessing && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm text-blue-700">
                  Processing documents, please wait...
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 