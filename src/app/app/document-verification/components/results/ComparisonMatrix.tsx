"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle, Minus } from 'lucide-react';
import { DocumentType, DocumentState, BaseDocumentData } from '../../types';

interface ComparisonMatrixProps {
  documents: Record<DocumentType, DocumentState>;
}

interface ComparisonField {
  key: string;
  label: string;
  extractor: (data: BaseDocumentData) => string | null;
}

export default function ComparisonMatrix({ documents }: ComparisonMatrixProps) {
  // 获取已上传的文档
  const uploadedDocs = Object.entries(documents).filter(([, state]) => state.uploaded && state.data);
  
  if (uploadedDocs.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Comparison Matrix</CardTitle>
          <CardDescription>Upload at least 2 documents to see comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Upload more documents to enable cross-comparison analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  // 定义比较字段
  const comparisonFields: ComparisonField[] = [
    {
      key: 'name',
      label: 'Full Name',
      extractor: (data) => data.name
    },
    {
      key: 'licence_number',
      label: 'License Number',
      extractor: (data) => data.licence_number
    },
    {
      key: 'date_of_birth',
      label: 'Date of Birth',
      extractor: (data) => data.date_of_birth
    },
    {
      key: 'address',
      label: 'Address',
      extractor: (data) => data.address?.replace(/\\n/g, ', ') || null
    }
  ];

  // 获取比较状态
  const getComparisonStatus = (field: ComparisonField) => {
    const values = uploadedDocs.map(([, state]) => {
      if (!state.data) return null;
      return field.extractor(state.data);
    }).filter(value => value !== null);

    if (values.length === 0) return { status: 'no-data', icon: Minus, color: 'text-gray-400' };
    if (values.length === 1) return { status: 'single', icon: Minus, color: 'text-gray-400' };
    
    // 检查所有值是否相同
    const allSame = values.every(value => value === values[0]);
    
    if (allSame) {
      return { status: 'match', icon: CheckCircle, color: 'text-green-500' };
    } else {
      // 检查部分匹配（对于地址等可能有格式差异的字段）
      if (field.key === 'address') {
        const normalizedValues = values.map(v => v?.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const partialMatch = normalizedValues.every(v => v === normalizedValues[0]);
        if (partialMatch) {
          return { status: 'partial', icon: AlertTriangle, color: 'text-yellow-500' };
        }
      }
      return { status: 'mismatch', icon: XCircle, color: 'text-red-500' };
    }
  };

  // 获取字段值以供显示
  const getFieldValue = (docType: string, field: ComparisonField): string => {
    const docState = documents[docType as DocumentType];
    if (!docState.data) return 'N/A';
    
    const value = field.extractor(docState.data);
    return value || 'N/A';
  };

  // 计算总体匹配分数
  const calculateMatchScore = () => {
    const scores = comparisonFields.map(field => {
      const status = getComparisonStatus(field);
      switch (status.status) {
        case 'match': return 100;
        case 'partial': return 70;
        case 'mismatch': return 0;
        default: return 50; // no-data or single
      }
    });
    
    return Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
  };

  const matchScore = calculateMatchScore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Document Comparison Matrix</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Match Score:</span>
            <span className={`font-bold ${
              matchScore >= 90 ? 'text-green-600' :
              matchScore >= 70 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {matchScore}%
            </span>
          </div>
        </CardTitle>
        <CardDescription>
          Cross-document field comparison and consistency analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">Field</th>
                {uploadedDocs.map(([type]) => (
                  <th key={type} className="text-left py-3 px-4 font-medium capitalize">
                    {type.replace('autoplus', 'Auto+')} Data
                  </th>
                ))}
                <th className="text-center py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {comparisonFields.map((field) => {
                const status = getComparisonStatus(field);
                const StatusIcon = status.icon;
                
                return (
                  <tr key={field.key} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {field.label}
                    </td>
                    {uploadedDocs.map(([type]) => (
                      <td key={type} className="py-3 px-4 max-w-xs">
                        <div className="truncate" title={getFieldValue(type, field)}>
                          {getFieldValue(type, field)}
                        </div>
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <StatusIcon className={`w-4 h-4 ${status.color}`} />
                        <span className={`text-xs capitalize ${status.color}`}>
                          {status.status.replace('-', ' ')}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 比较统计 */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { label: 'Perfect Matches', status: 'match', color: 'text-green-600' },
              { label: 'Partial Matches', status: 'partial', color: 'text-yellow-600' },
              { label: 'Mismatches', status: 'mismatch', color: 'text-red-600' },
              { label: 'No Data', status: 'no-data', color: 'text-gray-400' }
            ].map((stat) => {
              const count = comparisonFields.filter(field => 
                getComparisonStatus(field).status === stat.status
              ).length;
              
              return (
                <div key={stat.status} className="space-y-1">
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {count}
                  </div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 详细分析 */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-medium text-gray-900 mb-3">Analysis Summary</h4>
          <div className="space-y-2 text-sm">
            {comparisonFields.map((field) => {
              const status = getComparisonStatus(field);
              if (status.status === 'match') return null; // 跳过完全匹配的字段
              
              return (
                <div 
                  key={field.key}
                  className={`p-3 rounded-lg border-l-4 ${
                    status.status === 'mismatch' ? 'bg-red-50 border-red-500' :
                    status.status === 'partial' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-gray-50 border-gray-500'
                  }`}
                >
                  <div className="font-medium">
                    {field.label}: {status.status === 'mismatch' ? 'Data Mismatch' : 
                                   status.status === 'partial' ? 'Partial Match' : 'Insufficient Data'}
                  </div>
                  <div className="text-gray-600 mt-1">
                    {status.status === 'mismatch' ? 
                      'Values differ across documents. Verification required.' :
                     status.status === 'partial' ?
                      'Similar values with minor formatting differences.' :
                      'Field not available in all documents.'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 