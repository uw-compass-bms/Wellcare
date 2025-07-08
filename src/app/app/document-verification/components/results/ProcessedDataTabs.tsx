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

  // 获取有数据的文档 - 支持实时显示
  const availableDocs = documentConfigs.filter(config => {
    const docState = documents[config.type];
    return docState.data || docState.loading || docState.error;
  });

  // 设置默认激活标签
  React.useEffect(() => {
    if (availableDocs.length > 0 && !activeTab) {
      setActiveTab(availableDocs[0].type);
    }
  }, [availableDocs, activeTab]);

  if (availableDocs.length === 0) return null;

  // 获取标签图标和状态
  const getTabIcon = (type: DocumentType) => {
    const docState = documents[type];
    const isCurrentlyProcessing = docState.loading || processingStep === type;
    
    if (isCurrentlyProcessing) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    if (docState.error) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    
    const config = documentConfigs.find(c => c.type === type);
    if (config) {
      const IconComponent = config.icon;
      return <IconComponent className={`w-4 h-4 ${config.color}`} />;
    }
    
    return <FileText className="w-4 h-4" />;
  };

  // 渲染文档数据 - 支持实时显示
  const renderDocumentData = (type: DocumentType) => {
    const documentState = documents[type];
    const isCurrentlyProcessing = documentState.loading || processingStep === type;
    
    // 如果正在处理，显示加载状态
    if (isCurrentlyProcessing) {
      return (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">
              {processingStep === type ? 'Re-extracting data...' : 'Extracting data...'}
            </p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we process your document</p>
          </div>
        </div>
      );
    }
    
    // 如果没有数据，显示空状态
    if (!documentState.data) {
      return (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No data available</p>
            <p className="text-sm mt-2">Please upload and process documents to view extracted data</p>
          </div>
        </div>
      );
    }

    // 渲染实际数据
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
            {availableDocs.map((config) => (
              <Button
                key={config.type}
                variant={activeTab === config.type ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(config.type)}
                className="flex items-center space-x-2"
              >
                {getTabIcon(config.type)}
                <span>{config.title}</span>
              </Button>
            ))}
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
            
            {/* 文档数据 - 实时显示 */}
            {renderDocumentData(activeTab)}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 