'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG, VehicleAgeResult } from './types';
import { ApplicationData, QuoteData } from '../../../types';

export default function VehicleAgeValidation({ documents, onResultChange }: BusinessRuleProps) {
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
            vehicle_year: application.vehicle_year,
            insurance_coverages: application.insurance_coverages
          } : undefined,
          quote: quote ? {
            vehicle_year: quote.vehicle_year
          } : undefined
        };

        // 调用后端API
        const response = await fetch('/api/business-rules/vehicle-age', {
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
        console.error('Vehicle age validation error:', error);
        
        // 处理API调用失败的情况
        const errorResult: BusinessRuleResult = {
          id: 'vehicle_age_coverage',
          name: 'Vehicle Age & Coverage Validation',
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
          <span className="text-gray-600">Validating vehicle age and coverage...</span>
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
            <strong>Vehicle Analysis:</strong>
            <div className="mt-2 space-y-3">
              {/* 车辆基本信息 */}
              <div className="border-l-4 border-blue-500 pl-3">
                <h5 className="font-medium text-sm text-blue-900">Vehicle Information</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs mt-1">
                  <div><strong>Year:</strong> {(result.result as VehicleAgeResult).vehicle_year}</div>
                  <div><strong>Age:</strong> {(result.result as VehicleAgeResult).vehicle_age} year(s)</div>
                  <div><strong>Risk Level:</strong> 
                    <span className={`ml-1 px-1 py-0.5 rounded text-xs ${
                      (result.result as VehicleAgeResult).risk_level === 'high' ? 'bg-red-100 text-red-800' :
                      (result.result as VehicleAgeResult).risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {(result.result as VehicleAgeResult).risk_level?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 保险覆盖详情 */}
              <div className="border-l-4 border-green-500 pl-3">
                <h5 className="font-medium text-sm text-green-900">Coverage Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
                  <div><strong>Liability:</strong> {(result.result as VehicleAgeResult).coverage_details?.liability || 'N/A'}</div>
                  <div><strong>Comprehensive:</strong> {(result.result as VehicleAgeResult).coverage_details?.comprehensive ? 'Yes' : 'No'}</div>
                  <div><strong>Collision:</strong> {(result.result as VehicleAgeResult).coverage_details?.collision ? 'Yes' : 'No'}</div>
                  <div><strong>All Perils:</strong> {(result.result as VehicleAgeResult).coverage_details?.all_perils ? 'Yes' : 'No'}</div>
                </div>
              </div>

              {/* 风险提醒 */}
              {(result.result as VehicleAgeResult).risk_level === 'high' && (
                <div className="border-l-4 border-red-500 pl-3">
                  <h5 className="font-medium text-sm text-red-900">Risk Assessment</h5>
                  <div className="text-xs mt-1 space-y-1">
                    <div className="text-red-800">⚠️ High Risk: New vehicle without adequate coverage</div>
                    <div className="text-red-700">• Required: All Perils OR (Comprehensive + Collision)</div>
                    <div className="text-red-700">• Review customer&apos;s needs and recommend appropriate coverage</div>
                    <div className="text-red-700">• Document decision rationale in customer file</div>
                    <div className="text-red-700">• Consider policy terms and customer risk tolerance</div>
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