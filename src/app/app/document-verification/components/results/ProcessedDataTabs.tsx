"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Car, Calculator, FileCheck } from 'lucide-react';
import { DocumentType, DocumentState, MvrData, AutoPlusData, QuoteData, ApplicationData } from '../../types';
import { MvrDataDisplay, AutoPlusDataDisplay, QuoteDataDisplay, ApplicationDataDisplay } from './data-displays';

interface ProcessedDataTabsProps {
  documents: Record<DocumentType, DocumentState>;
}

export default function ProcessedDataTabs({ documents }: ProcessedDataTabsProps) {
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
        <div className="flex space-x-1 mb-6 border-b">
          {uploadedDocs.map((config) => {
            const IconComponent = config.icon;
            return (
              <Button
                key={config.type}
                variant={activeTab === config.type ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(config.type)}
                className="flex items-center space-x-2"
              >
                <IconComponent className={`w-4 h-4 ${config.color}`} />
                <span>{config.title}</span>
              </Button>
            );
          })}
        </div>

        {/* 活动标签内容 */}
        {activeTab && (
          <div className="min-h-[400px]">
            {renderDocumentData(activeTab)}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 