'use client';

import { useState } from 'react';
import { MvrData, MvrMultiData } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

interface MvrDataDisplayProps {
  data: MvrData | MvrMultiData;
}

// 判断是否为多文件数据
function isMvrMultiData(data: MvrData | MvrMultiData): data is MvrMultiData {
  return 'records' in data && Array.isArray(data.records);
}

// 单个MVR记录显示组件
function SingleMvrRecord({ record, index, showFileName = false }: { 
  record: MvrData; 
  index?: number; 
  showFileName?: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* 文件名和记录标题 */}
      {showFileName && (
        <div className="border-b pb-3">
          <h4 className="font-medium text-lg text-gray-900">
            MVR Record {index !== undefined ? `#${index + 1}` : ''}
          </h4>
          {record.file_name && (
            <p className="text-sm text-gray-600">File: {record.file_name}</p>
          )}
        </div>
      )}

      {/* 基本信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div><strong>Name:</strong> {record.name || 'N/A'}</div>
            <div><strong>Gender:</strong> {record.gender || 'N/A'}</div>
            <div><strong>Date of Birth:</strong> {record.date_of_birth || 'N/A'}</div>
          </div>
          <div className="space-y-2">
            <div><strong>License Number:</strong> {record.licence_number || 'N/A'}</div>
            <div><strong>License Class:</strong> {record.class || 'N/A'}</div>
            <div>
              <strong>Status:</strong> 
              <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                record.status === 'LICENCED' ? 'bg-green-100 text-green-800' :
                record.status === 'EXPIRED' ? 'bg-yellow-100 text-yellow-800' :
                record.status === 'SUSPENDED' ? 'bg-red-100 text-red-800' :
                record.status === 'UNLICENSED' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {record.status || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 驾照状态警告 */}
      {record.status && record.status !== 'LICENCED' && (
        <div className="p-4 rounded-lg border-l-4 border-red-500 bg-red-50">
          <div className="flex items-center">
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">
                License Status Alert
              </h4>
              <p className="text-sm text-red-700 mt-1">
                This license status is <strong>{record.status}</strong>, which is not a valid LICENCED status. Please carefully review and confirm the driver&apos;s driving eligibility.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 地址信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Address</h4>
        <p className="text-sm text-gray-700">{record.address?.replace(/\\n/g, ', ') || 'N/A'}</p>
      </div>

      {/* 驾照信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">License Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Issue Date:</strong> {record.issue_date || 'N/A'}</div>
          <div><strong>Expiry Date:</strong> {record.expiry_date || 'N/A'}</div>
        </div>
      </div>

      {/* 条件限制 - 过滤掉不需要的条件 */}
      {(() => {
        const validConditions = record.conditions?.filter(condition => 
          // 过滤掉不需要的条件
          !condition.description.includes('REQUIRES CORRECTIVE LENSES') &&
          !condition.description.includes('CORRECTIVE LENSES') &&
          !condition.description.includes('SEARCH SUCCESSFUL - NO PUBLIC RECORD')
        ) || [];
        
        return validConditions.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">License Conditions</h4>
            <div className="space-y-2">
              {validConditions.map((condition, condIndex) => (
                <div key={condIndex} className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
                  <p className="text-sm font-medium">{condition.description}</p>
                  {condition.date && <p className="text-xs text-gray-500">Date: {condition.date}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 违规记录 - 优化显示 */}
      {record.convictions && record.convictions.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Convictions</h4>
          <div className="space-y-3">
            {record.convictions.map((conviction, convIndex) => (
              <div key={convIndex} className="border-l-4 border-red-500 pl-4 py-3 bg-red-50 rounded-r-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">{conviction.description}</p>
                    {conviction.date && (
                      <p className="text-xs text-red-700 mt-1">
                        <strong>Conviction Date:</strong> {conviction.date}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Conviction
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 没有违规记录时显示 */}
      {(!record.convictions || record.convictions.length === 0) && (
        <div className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 rounded-r-lg">
          <p className="text-sm font-medium text-green-900">No Convictions</p>
          <p className="text-xs text-green-700 mt-1">This driver has no relevant conviction records.</p>
        </div>
      )}
    </div>
  );
}

export default function MvrDataDisplay({ data }: MvrDataDisplayProps) {
  const [expandedRecords, setExpandedRecords] = useState<Set<number>>(new Set());
  const [showAll, setShowAll] = useState(false);

  // 如果是单个MVR记录，直接显示
  if (!isMvrMultiData(data)) {
    return <SingleMvrRecord record={data} />;
  }

  // 多个MVR记录的处理
  const toggleRecord = (index: number) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRecords(newExpanded);
  };

  const toggleAll = () => {
    if (showAll) {
      setExpandedRecords(new Set());
    } else {
      setExpandedRecords(new Set(data.records.map((_, index) => index)));
    }
    setShowAll(!showAll);
  };

  // 获取记录状态
  const getRecordStatus = (record: MvrData) => {
    if (record.convictions && record.convictions.length > 0) {
      return 'warning';
    }
    if (record.status && record.status !== 'LICENCED') {
      return 'error';
    }
    return 'success';
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-green-200 bg-green-50';
    }
  };
  return (
    <div className="space-y-6">
      {/* 全部展开/收起按钮 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          MVR Records ({data.records.length})
        </h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={toggleAll}
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Collapse All
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Expand All
            </>
          )}
        </Button>
      </div>

      {/* MVR记录列表 */}
      <div className="space-y-4">
        {data.records.map((record, index) => {
          const isExpanded = expandedRecords.has(index);
          const status = getRecordStatus(record);
          
          return (
            <Card key={index} className={`${getStatusColor(status)} border-l-4`}>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleRecord(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status)}
                    <div>
                      <CardTitle className="text-lg">
                        MVR Record #{index + 1}
                      </CardTitle>
                      <div className="text-sm text-gray-600 space-y-1">
                        {record.file_name && (
                          <div>File: {record.file_name}</div>
                        )}
                        <div>
                          <strong>Name:</strong> {record.name || 'N/A'} |{' '}
                          <strong>License:</strong> {record.licence_number || 'N/A'} |{' '}
                          <strong>Status:</strong> {record.status || 'N/A'}
                        </div>
                        {record.convictions && record.convictions.length > 0 && (
                          <div className="text-red-600">
                            {record.convictions.length} conviction(s)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.status === 'LICENCED' ? 'bg-green-100 text-green-800' :
                      record.status === 'EXPIRED' ? 'bg-yellow-100 text-yellow-800' :
                      record.status === 'SUSPENDED' ? 'bg-red-100 text-red-800' :
                      record.status === 'UNLICENSED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {record.status || 'N/A'}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="border-t pt-4">
                    <SingleMvrRecord record={record} index={index} showFileName={true} />
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {data.records.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No MVR records found.
        </div>
      )}
    </div>
  );
} 