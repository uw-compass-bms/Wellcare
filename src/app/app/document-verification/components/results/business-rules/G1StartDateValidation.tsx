'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG, G1StartDateResult } from './types';
import { MvrData, QuoteData } from '../../../types';

export default function G1StartDateValidation({ documents, onResultChange }: BusinessRuleProps) {
  const [result, setResult] = useState<BusinessRuleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const onResultChangeRef = useRef(onResultChange);
  
  // 更新ref以避免stale closure
  useEffect(() => {
    onResultChangeRef.current = onResultChange;
  }, [onResultChange]);

  useEffect(() => {
    const validateRule = async () => {
      setLoading(true);
      
      try {
        // 准备API请求数据
        const mvr = documents.mvr as MvrData | undefined;
        const quote = documents.quote as QuoteData | undefined;

        const requestData = {
          mvr: mvr ? {
            date_of_birth: mvr.date_of_birth,
            expiry_date: mvr.expiry_date,
            issue_date: mvr.issue_date
          } : undefined,
          quote: quote ? {
            date_g1: quote.date_g1
          } : undefined
        };

        // 调用后端API
        const response = await fetch('/api/business-rules/g1-start-date', {
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
        console.error('G1 start date validation error:', error);
        
        // 处理API调用失败的情况
        const errorResult: BusinessRuleResult = {
          id: 'g1_start_date',
          name: 'G1 Start Date Validation',
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
          <span className="text-gray-600">Validating G1 start date...</span>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const config = RULE_STATUS_CONFIG[result.status];
  const g1Result = result.result as G1StartDateResult;

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
            <strong>Validation Results:</strong>
            
            <div className="mt-2 space-y-3">
              {/* MVR计算结果 */}
              <div className="border-l-4 border-blue-500 pl-3">
                <h5 className="font-medium text-sm text-blue-900 mb-2">MVR G1 Date Calculation</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div><strong>Birth Date:</strong> {g1Result.birth_date || 'N/A'}</div>
                  <div><strong>Expiry Date:</strong> {g1Result.expiry_date || 'N/A'}</div>
                  <div><strong>Issue Date:</strong> {g1Result.issue_date || 'N/A'}</div>
                  <div><strong>Birth Month-Day:</strong> {g1Result.birth_month_day || 'N/A'}</div>
                  <div><strong>Expiry Month-Day:</strong> {g1Result.expiry_month_day || 'N/A'}</div>
                  <div><strong>Calculated G1 Date:</strong> {g1Result.mvr_calculated_g1_date || 'N/A'}</div>
                </div>
                <div className="mt-2 text-xs text-blue-800">
                  <strong>Method:</strong> {g1Result.calculation_method || 'N/A'}
                </div>
              </div>
              
              {/* Quote对比结果 */}
              <div className="border-l-4 border-green-500 pl-3">
                <h5 className="font-medium text-sm text-green-900 mb-2">Quote G1 Date Comparison</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div><strong>Quote G1 Date:</strong> {g1Result.quote_g1_date || 'N/A'}</div>
                  <div><strong>MVR Calculated G1:</strong> {g1Result.mvr_calculated_g1_date || 'N/A'}</div>
                  <div><strong>Dates Match:</strong> {g1Result.dates_match ? 'Yes' : 'No'}</div>
                  <div><strong>Difference (Days):</strong> {g1Result.date_difference_days !== null ? g1Result.date_difference_days : 'N/A'}</div>
                </div>
                
                {/* 日期匹配状态显示 */}
                {g1Result.mvr_calculated_g1_date && g1Result.quote_g1_date && (
                  <div className="mt-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      g1Result.dates_match 
                        ? 'bg-green-100 text-green-800 border border-green-300' 
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {g1Result.dates_match ? '✓ Dates Match' : '✗ Dates Don\'t Match'}
                    </span>
                  </div>
                )}
              </div>
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