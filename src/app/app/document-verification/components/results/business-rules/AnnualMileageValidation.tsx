'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG, AnnualMileageResult } from './types';
import { ApplicationData, QuoteData } from '../../../types';

export default function AnnualMileageValidation({ documents, onResultChange }: BusinessRuleProps) {
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
        const application = documents.application as unknown as ApplicationData | undefined;
        const quote = documents.quote as unknown as QuoteData | undefined;

        const requestData = {
          application: application ? {
            annual_mileage: application.annual_mileage,
            commute_distance: application.commute_distance
          } : undefined,
          quote: quote ? {
            annual_mileage: quote.annual_mileage,
            commute_distance: quote.commute_distance
          } : undefined
        };

        // 调用后端API
        const response = await fetch('/api/business-rules/annual-mileage', {
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
        console.error('Annual mileage validation error:', error);
        
        // 处理API调用失败的情况
        const errorResult: BusinessRuleResult = {
          id: 'annual_mileage',
          name: 'Annual Mileage & Commute Validation',
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
          <span className="text-gray-600">Validating annual mileage...</span>
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
              <div><strong>Annual:</strong> {typeof (result.result as AnnualMileageResult).parsed_distance === 'number' 
                ? `${((result.result as AnnualMileageResult).parsed_distance as number).toLocaleString()} km` 
                : (result.result as AnnualMileageResult).parsed_distance}</div>
              {(result.result as AnnualMileageResult).parsed_commute !== null && (
                <div><strong>Commute:</strong> {(result.result as AnnualMileageResult).parsed_commute} km</div>
              )}
            </div>
            
            {result.status === 'requires_review' && (
              <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
                <strong>Required Actions:</strong>
                <ul className="mt-1 ml-4 list-disc space-y-1">
                  {Array.isArray((result.result as AnnualMileageResult).issues) && (result.result as AnnualMileageResult).issues?.map((issue: string, index: number) => (
                    <li key={index} className="text-red-700 font-medium">{issue}</li>
                  ))}
                </ul>
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>Mark this application for supervisor review</li>
                  <li>Verify customer driving patterns and usage</li>
                  <li>Update system notes with review status</li>
                  <li>Consider requesting additional documentation if needed</li>
                  <li>Confirm annual mileage and commute distance accuracy</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="text-xs opacity-75">
          <strong>Data Sources:</strong> {result.data_sources?.join(', ')}
        </div>
      </div>
    </div>
  );
} 