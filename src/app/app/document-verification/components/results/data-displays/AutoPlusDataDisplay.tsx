'use client';

import React, { useState } from 'react';
import { AutoPlusData, AutoPlusMultiData } from '../../../types';
import { ChevronDown, ChevronUp, ChevronRight, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface AutoPlusDataDisplayProps {
  data: AutoPlusData | AutoPlusMultiData;
}

// 检查是否是多文件数据
function isMultiData(data: AutoPlusData | AutoPlusMultiData): data is AutoPlusMultiData {
  return 'records' in data && Array.isArray(data.records) && data.records.length > 0;
}

export default function AutoPlusDataDisplay({ data }: AutoPlusDataDisplayProps) {
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  // 如果是多文件数据，显示多文件界面
  if (isMultiData(data)) {
    const records = data.records;
    
    const totalRecords = records.length;
    
    const toggleRecord = (recordId: string) => {
      setExpandedRecords(prev => {
        const newSet = new Set(prev);
        if (newSet.has(recordId)) {
          newSet.delete(recordId);
        } else {
          newSet.add(recordId);
        }
        return newSet;
      });
    };

    const toggleExpandAll = () => {
      if (expandAll) {
        setExpandedRecords(new Set());
      } else {
        setExpandedRecords(new Set(records.map(record => record.file_id || record.file_name || `record-${records.indexOf(record)}`)));
      }
      setExpandAll(!expandAll);
    };

    return (
      <div className="space-y-6">
        {/* 展开/收起所有按钮 */}
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Individual Records ({totalRecords})</h3>
          <button
            onClick={toggleExpandAll}
            className="text-sm text-green-600 hover:text-green-800 flex items-center space-x-1"
          >
            {expandAll ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Expand All</span>
              </>
            )}
          </button>
        </div>

        {/* 记录列表 */}
        <div className="space-y-3">
          {records.map((record, index) => {
            const recordId = record.file_id || record.file_name || `record-${index}`;
            const isExpanded = expandedRecords.has(recordId);
            const hasClaims = record.claims && record.claims.length > 0;
            const hasAtFaultClaims = record.claims && record.claims.some(claim => claim.at_fault);
            const hasPolicies = record.policies && record.policies.length > 0;

            return (
              <div key={recordId} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* 记录头部 */}
                <div
                  className={`p-4 cursor-pointer transition-colors ${
                    isExpanded ? 'bg-green-50 border-b border-green-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleRecord(recordId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {record.name || 'Unknown Name'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.file_name || `Record ${index + 1}`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {/* 状态指示器 */}
                      <div className="flex items-center space-x-2">
                        {hasPolicies && (
                          <div className="flex items-center space-x-1 text-blue-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-xs">Policies</span>
                          </div>
                        )}
                        {hasClaims && (
                          <div className={`flex items-center space-x-1 ${hasAtFaultClaims ? 'text-red-600' : 'text-orange-600'}`}>
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs">Claims</span>
                          </div>
                        )}
                      </div>
                      
                      <ChevronRight className={`w-5 h-5 text-gray-400 transform transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`} />
                    </div>
                  </div>
                </div>

                {/* 记录详情 */}
                {isExpanded && (
                  <div className="p-4 bg-white">
                    <AutoPlusRecordDetails record={record} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 单文件数据，显示原有界面
  return <AutoPlusRecordDetails record={data} />;
}

// 单个记录详情组件
function AutoPlusRecordDetails({ record }: { record: AutoPlusData }) {
  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div><strong>Name:</strong> {record.name || 'N/A'}</div>
            <div><strong>License Number:</strong> {record.licence_number || 'N/A'}</div>
          </div>
          <div className="space-y-2">
            <div><strong>Date of Birth:</strong> {record.date_of_birth || 'N/A'}</div>
            <div><strong>First Insurance Date:</strong> {record.first_insurance_date || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* 地址信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Address</h4>
        <p className="text-sm text-gray-700">{record.address?.replace(/\\n/g, ', ') || 'N/A'}</p>
      </div>

      {/* 保单历史 */}
      {record.policies && record.policies.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Policy History</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 border-b">Policy Period</th>
                  <th className="text-left py-2 px-3 border-b">Company</th>
                  <th className="text-left py-2 px-3 border-b">Status</th>
                </tr>
              </thead>
              <tbody>
                {record.policies.map((policy: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-3">{policy.policy_period}</td>
                    <td className="py-2 px-3">{policy.company}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        policy.status.includes('Cancelled') 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {policy.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 理赔历史 */}
      {record.claims && record.claims.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Claims History</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 border-b">Claim Number</th>
                  <th className="text-left py-2 px-3 border-b">Date of Loss</th>
                  <th className="text-left py-2 px-3 border-b">At Fault</th>
                  <th className="text-left py-2 px-3 border-b">Amount</th>
                  <th className="text-left py-2 px-3 border-b">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {record.claims.map((claim: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-3">{claim.claim_number}</td>
                    <td className="py-2 px-3">{claim.date_of_loss}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        claim.at_fault 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {claim.at_fault ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-2 px-3">{claim.total_claim_amount}</td>
                    <td className="py-2 px-3">{claim.coverage_types || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 