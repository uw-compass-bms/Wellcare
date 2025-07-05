'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG, G1StartDateResult } from './types';
import { MvrData, QuoteData, AutoPlusData } from '../../../types';

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
        const mvr = documents.mvr as unknown as MvrData | undefined;
        const quote = documents.quote as unknown as QuoteData | undefined;
        const autoplus = documents.autoplus as unknown as AutoPlusData | undefined;

        const requestData = {
          mvr: mvr ? {
            date_of_birth: mvr.date_of_birth,
            expiry_date: mvr.expiry_date,
            issue_date: mvr.issue_date
          } : undefined,
          quote: quote ? {
            date_g1: quote.date_g1,
            date_g2: quote.date_g2,
            date_g: quote.date_g
          } : undefined,
          autoplus: autoplus ? {
            first_insurance_date: autoplus.first_insurance_date
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
          name: 'G1 Start Date Validation & Cross-Document Verification',
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
  }, [documents]); // 移除onResultChange依赖，使用ref避免无限循环

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
                <h5 className="font-medium text-sm text-blue-900">MVR G1 Calculation</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
                  <div><strong>Calculated G1 Date:</strong> {(result.result as G1StartDateResult).mvr_calculated_g1_date}</div>
                  <div><strong>Method:</strong> {(result.result as G1StartDateResult).calculation_method}</div>
                  <div><strong>Birth Date:</strong> {(result.result as G1StartDateResult).birth_date}</div>
                  <div><strong>Expiry Date:</strong> {(result.result as G1StartDateResult).expiry_date}</div>
                  {(result.result as G1StartDateResult).issue_date !== 'N/A' && (
                    <div><strong>Issue Date:</strong> {(result.result as G1StartDateResult).issue_date}</div>
                  )}
                </div>
              </div>
              
              {/* Quote对比结果 */}
              {(result.result as G1StartDateResult).quote_g1_date !== 'N/A' && (
                <div className="border-l-4 border-green-500 pl-3">
                  <h5 className="font-medium text-sm text-green-900">Quote G1 Comparison</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
                    <div><strong>Quote G1 Date:</strong> {(result.result as G1StartDateResult).quote_g1_date}</div>
                    <div><strong>Dates Match:</strong> {(result.result as G1StartDateResult).g1_dates_match ? 'Yes' : 'No'}</div>
                    {(result.result as G1StartDateResult).quote_g2_date !== 'N/A' && (
                      <div><strong>Quote G2 Date:</strong> {(result.result as G1StartDateResult).quote_g2_date}</div>
                    )}
                    {(result.result as G1StartDateResult).quote_g_date !== 'N/A' && (
                      <div><strong>Quote G Date:</strong> {(result.result as G1StartDateResult).quote_g_date}</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 10年规则验证 */}
              {(result.result as G1StartDateResult).first_insurance_date !== 'N/A' && (
                <div className={`border-l-4 ${(result.result as G1StartDateResult).ten_year_rule_triggered ? 'border-red-500' : 'border-yellow-500'} pl-3`}>
                  <h5 className={`font-medium text-sm ${(result.result as G1StartDateResult).ten_year_rule_triggered ? 'text-red-900' : 'text-yellow-900'}`}>
                    10-Year Rule Verification
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
                    <div><strong>First Insurance Date:</strong> {(result.result as G1StartDateResult).first_insurance_date}</div>
                    <div><strong>License Date:</strong> {(result.result as G1StartDateResult).quote_g2_date !== 'N/A' ? (result.result as G1StartDateResult).quote_g2_date : (result.result as G1StartDateResult).quote_g_date}</div>
                    {(result.result as G1StartDateResult).license_insurance_years_diff !== null && (
                      <div><strong>Years Difference:</strong> {((result.result as G1StartDateResult).license_insurance_years_diff as number).toFixed(1)} years</div>
                    )}
                    <div><strong>10-Year Rule Triggered:</strong> {(result.result as G1StartDateResult).ten_year_rule_triggered ? 'Yes' : 'No'}</div>
                  </div>
                </div>
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