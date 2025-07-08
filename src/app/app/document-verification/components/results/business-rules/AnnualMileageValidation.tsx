'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG, AnnualMileageResult, SingleVehicleAnnualMileageResult } from './types';
import { QuoteData } from '../../../types';

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
        const quote = documents.quote as unknown as QuoteData | undefined;

        // 构建符合后端期望的数据结构
        const requestData = {
          quote: quote ? {
            // 向后兼容字段
            annual_mileage: quote.annual_mileage,
            commute_distance: quote.commute_distance,
            // 多车辆数据
            vehicles: quote.vehicles?.map((vehicle: QuoteData['vehicles'][0]) => ({
              vehicle_id: vehicle.vehicle_id,
              annual_km: vehicle.annual_km,
              business_km: vehicle.business_km,
              daily_km: vehicle.daily_km,
              vehicle_year: vehicle.vehicle_year,
              vehicle_make: vehicle.vehicle_make,
              vehicle_model: vehicle.vehicle_model
            })) || []
          } : undefined
        };

        console.log('Annual mileage validation request:', requestData);

        // 调用后端API
        const response = await fetch('/api/business-rules/annual-mileage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API response error:', errorText);
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
  }, [documents]);

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
        
                        {/* 多车辆结果显示 */}
        {result.result && (result.result as AnnualMileageResult).vehicles && (result.result as AnnualMileageResult).vehicles!.length > 0 ? (
          <div className="mt-3 space-y-3">
            {(result.result as AnnualMileageResult).vehicles!.map((vehicle: SingleVehicleAnnualMileageResult, index: number) => (
              <div key={index} className="text-sm">
                <div className="font-medium mb-2">{vehicle.vehicle_info || `Vehicle ${index + 1}`}</div>
                
                <div className="text-xs">
                  {vehicle.annual_km && (
                    <div><strong>Annual Mileage:</strong> {vehicle.annual_km}</div>
                  )}
                  {vehicle.commute_distance && (
                    <div><strong>Commute Distance:</strong> {vehicle.commute_distance}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* 单车辆结果显示（向后兼容） */
          result.result && (
            <div className="mt-3 text-xs">
              <div><strong>Annual Mileage:</strong> {(result.result as AnnualMileageResult).parsed_distance}</div>
              {(result.result as AnnualMileageResult).parsed_commute !== null && (
                <div><strong>Commute Distance:</strong> {(result.result as AnnualMileageResult).parsed_commute} km</div>
              )}
            </div>
          )
        )}

        <div className="text-xs opacity-75">
          <strong>Data Sources:</strong> {result.data_sources?.join(', ')}
        </div>
      </div>
    </div>
  );
} 