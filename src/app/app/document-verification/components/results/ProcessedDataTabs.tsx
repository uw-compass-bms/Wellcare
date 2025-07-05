"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Car, Calculator, FileCheck, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { DocumentType, DocumentState, MvrData, AutoPlusData, QuoteData, ApplicationData } from '../../types';
import { MvrDataDisplay, AutoPlusDataDisplay, QuoteDataDisplay, ApplicationDataDisplay } from './data-displays';

interface ProcessedDataTabsProps {
  documents: Record<DocumentType, DocumentState>;
  onReprocessDocument?: (type: DocumentType) => Promise<void>;
  isProcessing?: boolean;
  processingStep?: DocumentType | null;
}

export default function ProcessedDataTabs({ 
  documents, 
  onReprocessDocument, 
  isProcessing = false, 
  processingStep = null 
}: ProcessedDataTabsProps) {
  const [activeTab, setActiveTab] = useState<DocumentType | null>(null);

  // 文档配置
  const documentConfigs = [
    { type: 'mvr' as DocumentType, title: 'MVR Data', icon: FileText, color: 'text-blue-600' },
    { type: 'autoplus' as DocumentType, title: 'Auto+ Data', icon: Car, color: 'text-green-600' },
    { type: 'quote' as DocumentType, title: 'Quote Data', icon: Calculator, color: 'text-purple-600' },
    { type: 'application' as DocumentType, title: 'Application Data', icon: FileCheck, color: 'text-orange-600' }
  ];

  // 获取已上传的文档
  const uploadedDocs = documentConfigs.filter(config => documents[config.type].uploaded);

  // 设置默认激活标签
  React.useEffect(() => {
    if (uploadedDocs.length > 0 && !activeTab) {
      setActiveTab(uploadedDocs[0].type);
    }
  }, [uploadedDocs, activeTab]);

  if (uploadedDocs.length === 0) return null;

  // 渲染文档数据
  const renderDocumentData = (type: DocumentType) => {
    const documentState = documents[type];
    if (!documentState.data) return <div>No data available</div>;

    switch (type) {
      case 'mvr':
        return <MvrDataDisplay data={documentState.data as MvrData} />;
      case 'autoplus':
        return <AutoPlusDataDisplay data={documentState.data as AutoPlusData} />;
      case 'quote':
        return <QuoteDataDisplay data={documentState.data as QuoteData} />;
      case 'application':
        return <ApplicationDataDisplay data={documentState.data as ApplicationData} />;
      default:
        return <div>Unknown document type</div>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracted Document Data</CardTitle>
        <CardDescription>
          Detailed view of processed information from uploaded documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 标签导航 */}
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <div className="flex space-x-1">
            {uploadedDocs.map((config) => {
              const IconComponent = config.icon;
              const docState = documents[config.type];
              const isCurrentlyProcessing = processingStep === config.type;
              const hasError = !!docState.error;
              
              return (
                <Button
                  key={config.type}
                  variant={activeTab === config.type ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(config.type)}
                  className="flex items-center space-x-2"
                >
                  {isCurrentlyProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : hasError ? (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <IconComponent className={`w-4 h-4 ${config.color}`} />
                  )}
                  <span>{config.title}</span>
                </Button>
              );
            })}
          </div>
          
          {/* 重新提取按钮 */}
          {activeTab && onReprocessDocument && (
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => onReprocessDocument(activeTab)}
                disabled={isProcessing}
                size="sm"
                variant="outline"
                className="flex items-center space-x-2"
              >
                {processingStep === activeTab ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Re-extracting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Re-extract Data</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* 活动标签内容 */}
        {activeTab && (
          <div className="min-h-[400px]">
            {/* 错误状态 */}
            {documents[activeTab].error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h4 className="text-sm font-medium text-red-800">Extraction Error</h4>
                </div>
                <p className="mt-2 text-sm text-red-700">{documents[activeTab].error}</p>
                {onReprocessDocument && (
                  <Button
                    onClick={() => onReprocessDocument(activeTab)}
                    disabled={isProcessing}
                    size="sm"
                    variant="outline"
                    className="mt-3"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry Extraction
                  </Button>
                )}
              </div>
            )}
            
            {/* 处理中状态 */}
            {processingStep === activeTab && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  <h4 className="text-sm font-medium text-blue-800">Re-extracting Data</h4>
                </div>
                <p className="mt-2 text-sm text-blue-700">
                  Please wait while we re-extract the data from this document...
                </p>
              </div>
            )}
            
            {/* 文档数据 */}
            {!processingStep && renderDocumentData(activeTab)}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 