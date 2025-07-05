'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { BusinessRuleResult } from './types';
import { DocumentState, DocumentType } from '../../../types';
import G1StartDateValidation from './G1StartDateValidation';
import AnnualMileageValidation from './AnnualMileageValidation';
import NewDriverValidation from './NewDriverValidation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface BusinessRulesValidationProps {
  documents: Record<DocumentType, DocumentState>;
}

export default function BusinessRulesValidation({ documents }: BusinessRulesValidationProps) {
  const [ruleResults, setRuleResults] = useState<Record<string, BusinessRuleResult>>({});

  // 准备文档数据供规则使用 - 使用useMemo避免无限循环
  const preparedDocuments = useMemo(() => ({
    mvr: documents.mvr?.data as unknown as Record<string, unknown> | undefined,
    application: documents.application?.data as unknown as Record<string, unknown> | undefined,
    autoplus: documents.autoplus?.data as unknown as Record<string, unknown> | undefined,
    quote: documents.quote?.data as unknown as Record<string, unknown> | undefined,
  }), [
    documents.mvr?.data,
    documents.application?.data,
    documents.autoplus?.data,
    documents.quote?.data
  ]);

  // 处理规则结果更新
  const handleRuleResultChange = useCallback((result: BusinessRuleResult) => {
    setRuleResults(prev => ({
      ...prev,
      [result.id]: result
    }));
  }, []);

  // 计算总体状态统计
  const statusStats = Object.values(ruleResults).reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 获取总体状态
  const getOverallStatus = () => {
    const results = Object.values(ruleResults);
    if (results.length === 0) return 'pending';
    if (results.some(r => r.status === 'failed')) return 'failed';
    if (results.some(r => r.status === 'requires_review')) return 'requires_review';
    if (results.some(r => r.status === 'insufficient_data')) return 'insufficient_data';
    return 'passed';
  };

  const overallStatus = getOverallStatus();
  const totalRules = 3; // 现在有3个规则

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Business Rules Validation</span>
          <span className="text-sm font-normal text-gray-500">({Object.keys(ruleResults).length}/{totalRules} rules evaluated)</span>
        </CardTitle>
        <CardDescription>
          Automated validation of business logic and compliance requirements
        </CardDescription>
        
        {/* 状态统计 */}
        {Object.keys(ruleResults).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {statusStats.passed && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                ✓ {statusStats.passed} Passed
              </span>
            )}
            {statusStats.failed && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                ✗ {statusStats.failed} Failed
              </span>
            )}
            {statusStats.requires_review && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                ⚠ {statusStats.requires_review} Requires Review
              </span>
            )}
            {statusStats.insufficient_data && (
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                ? {statusStats.insufficient_data} Insufficient Data
              </span>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* 总体状态指示器 */}
          {Object.keys(ruleResults).length > 0 && (
            <div className={`p-3 rounded-lg border-l-4 ${
              overallStatus === 'passed' ? 'bg-green-50 border-green-400' :
              overallStatus === 'failed' ? 'bg-red-50 border-red-400' :
              overallStatus === 'requires_review' ? 'bg-yellow-50 border-yellow-400' :
              'bg-gray-50 border-gray-400'
            }`}>
              <h4 className={`font-medium ${
                overallStatus === 'passed' ? 'text-green-800' :
                overallStatus === 'failed' ? 'text-red-800' :
                overallStatus === 'requires_review' ? 'text-yellow-800' :
                'text-gray-800'
              }`}>
                Overall Validation Status: {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1).replace('_', ' ')}
              </h4>
              <p className={`text-sm mt-1 ${
                overallStatus === 'passed' ? 'text-green-700' :
                overallStatus === 'failed' ? 'text-red-700' :
                overallStatus === 'requires_review' ? 'text-yellow-700' :
                'text-gray-700'
              }`}>
                {overallStatus === 'passed' && 'All business rules have been validated successfully.'}
                {overallStatus === 'failed' && 'One or more rules have failed. Please review and take corrective action.'}
                {overallStatus === 'requires_review' && 'Some rules require manual review or supervisor approval.'}
                {overallStatus === 'insufficient_data' && 'Additional document data is needed to complete validation.'}
              </p>
            </div>
          )}

          {/* 规则验证组件 */}
          <div className="space-y-4">
            <h5 className="font-medium text-gray-900 border-b pb-2">Individual Rule Validations</h5>
            
            {/* 规则1: G1起始时间推算 */}
            <G1StartDateValidation
              documents={preparedDocuments}
              onResultChange={handleRuleResultChange}
            />

            {/* 规则2: 新司机判定 */}
            <NewDriverValidation
              documents={preparedDocuments}
              onResultChange={handleRuleResultChange}
            />

            {/* 规则3: 年行驶公里数审核 */}
            <AnnualMileageValidation
              documents={preparedDocuments}
              onResultChange={handleRuleResultChange}
            />

            {/* 未来规则占位符 */}
            <div className="p-4 border-2 border-dashed border-gray-200 rounded-lg text-center text-gray-500">
              <p className="text-sm">Additional business rules will be added here...</p>
              <p className="text-xs mt-1">Total planned rules: 36</p>
            </div>
          </div>

          {/* 操作建议汇总 */}
          {Object.keys(ruleResults).length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-medium text-blue-900 mb-2">Action Items Summary</h5>
              <div className="space-y-2 text-sm text-blue-800">
                {Object.values(ruleResults)
                  .filter(result => result.status !== 'passed')
                  .map((result, index) => (
                    <div key={result.id} className="flex items-start space-x-2">
                      <span className="text-blue-600 font-medium">{index + 1}.</span>
                      <div>
                        <strong>{result.name}:</strong> {result.recommendation}
                      </div>
                    </div>
                  ))}
                {Object.values(ruleResults).every(result => result.status === 'passed') && (
                  <p className="text-blue-800">✓ No action items required. All validations passed.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 