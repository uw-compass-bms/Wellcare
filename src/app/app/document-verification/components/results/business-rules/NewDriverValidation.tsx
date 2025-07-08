'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG, NewDriverResult, SingleDriverNewDriverResult } from './types';
import { QuoteData } from '../../../types';

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
        const quote = documents.quote as unknown as QuoteData | undefined;

        // 从QuoteData的vehicles中提取所有drivers
        const quoteDrivers: Array<{
          name: string;
          licence_number: string | null;
          date_insured: string | null;
          date_with_company: string | null;
        }> = [];
        
        if (quote?.vehicles) {
          quote.vehicles.forEach(vehicle => {
            if (vehicle.drivers) {
              vehicle.drivers.forEach(driver => {
                // 避免重复添加同一个驾驶员
                const existingDriver = quoteDrivers.find(qd => 
                  qd.name === driver.name && qd.licence_number === driver.licence_number
                );
                
                if (!existingDriver && driver.name) {
                  quoteDrivers.push({
                    name: driver.name,
                    licence_number: driver.licence_number,
                    date_insured: driver.date_insured,
                    date_with_company: driver.date_with_company
                  });
                }
              });
            }
          });
        }

        const requestData = {
          quote: quote ? {
            // 向后兼容字段
            date_insured: quote.date_insured,
            date_with_company: quote.date_with_company,
            // 多驾驶员数据
            drivers: quoteDrivers
          } : undefined
        };

        console.log('New driver validation request:', requestData);

        // 调用后端API
        const response = await fetch('/api/business-rules/new-driver', {
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
        
        {/* 多驾驶员结果显示 */}
        {result.result && (result.result as NewDriverResult).drivers && (result.result as NewDriverResult).drivers!.length > 0 ? (
          <div className="mt-3 space-y-3">
            {(result.result as NewDriverResult).drivers!.map((driver: SingleDriverNewDriverResult, index: number) => (
              <div key={index} className="text-sm">
                <div className="font-medium mb-2">{driver.driver_name || `Driver ${index + 1}`}</div>
                
                <div className="text-xs">
                  {driver.insurance_date ? (
                    <div><strong>Insurance Date:</strong> {driver.insurance_date}</div>
                  ) : (
                    <div><strong>Insurance Date:</strong> Not found</div>
                  )}
                  
                  {driver.years_of_history !== undefined && (
                    <div className="mt-1">
                      <strong>History:</strong> {driver.years_of_history.toFixed(1)} years
                      {driver.is_new_driver && <span className="text-orange-600 ml-2">• New Driver</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* 单驾驶员结果显示（向后兼容） */
          result.result && (result.result as NewDriverResult).years_of_history !== undefined && (
            <div className="mt-3 text-xs">
              <strong>History:</strong> {(result.result as NewDriverResult).years_of_history} years
              {(result.result as NewDriverResult).is_new_driver && <span className="text-orange-600 ml-2">• New Driver</span>}
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