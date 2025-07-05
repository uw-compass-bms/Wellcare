'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG, NewDriverResult } from './types';
import { QuoteData, AutoPlusData } from '../../../types';

export default function NewDriverValidation({ documents, onResultChange }: BusinessRuleProps) {
  const [result, setResult] = useState<BusinessRuleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const onResultChangeRef = useRef(onResultChange);

  // 避免闭包问题，更新ref
  useEffect(() => {
    onResultChangeRef.current = onResultChange;
  }, [onResultChange]);

  useEffect(() => {
    const validateRule = async () => {
      setLoading(true);
      
      try {
        // 准备API请求数据
        const autoplus = documents.autoplus as unknown as AutoPlusData | undefined;
        const quote = documents.quote as unknown as QuoteData | undefined;

        const requestData = {
          autoplus: autoplus ? {
            first_insurance_date: autoplus.first_insurance_date
          } : undefined,
          quote: quote ? {
            date_insured: quote.date_insured,
            date_with_company: quote.date_with_company
          } : undefined
        };

        // 调用后端API
        const response = await fetch('/api/business-rules/new-driver', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const apiResult: BusinessRuleResult = await response.json();
        
        setResult(apiResult);
        onResultChangeRef.current?.(apiResult);

      } catch (error) {
        console.error('New driver validation error:', error);
        
        // 处理API调用失败的情况
        const errorResult: BusinessRuleResult = {
          id: 'new_driver',
          name: 'New Driver Validation',
          status: 'failed',
          recommendation: 'System error occurred during validation',
          details: 'Unable to connect to validation service. Please try again.',
          data_sources: []
        };
        
        setResult(errorResult);
        onResultChangeRef.current?.(errorResult);
      } finally {
        setLoading(false);
      }
    };

    validateRule();
  }, [documents]);

  // 显示加载状态
  if (loading) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Validating new driver status...</span>
        </div>
      </div>
    );
  }

  if (!result) return null;
  const config = RULE_STATUS_CONFIG[result.status];

  return (
    <div className={`border rounded-lg p-4 ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`text-lg font-bold ${config.color}`}>{config.icon}</span>
          <h4 className={`font-medium ${config.color}`}>{result.name}</h4>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${config.color} ${config.bgColor} border ${config.borderColor}`}>
          {result.status.toUpperCase().replace('_', ' ')}
        </span>
      </div>
      <div className={`space-y-2 text-sm ${config.color}`}>
        <div>
          <strong>Recommendation:</strong> {result.recommendation}
        </div>
        <div>
          <strong>Details:</strong> {result.details}
        </div>
        {result.result && (
          <div className="mt-3 p-3 bg-white rounded border">
            <strong>Analysis:</strong>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div><strong>First Insurance Date:</strong> {(result.result as NewDriverResult).first_insurance_date || 'Not found'}</div>
              <div><strong>Years of History:</strong> {(result.result as NewDriverResult).years_of_history}</div>
              <div><strong>New Driver:</strong> {(result.result as NewDriverResult).is_new_driver ? 'Yes' : 'No'}</div>
              {(result.result as NewDriverResult).reason && (
                <div className="md:col-span-2"><strong>Reason:</strong> {(result.result as NewDriverResult).reason}</div>
              )}
            </div>
          </div>
        )}
        <div className="text-xs opacity-75">
          <strong>Data Sources:</strong> {result.data_sources?.join(', ')}
        </div>
      </div>
    </div>
  );
} 