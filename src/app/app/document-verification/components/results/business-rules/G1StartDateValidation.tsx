'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG, G1StartDateResult, MultiDriverG1Result } from './types';
import { MvrData, MvrMultiData, QuoteData } from '../../../types';

// 判断是否为多文件MVR数据
function isMvrMultiData(data: MvrData | MvrMultiData): data is MvrMultiData {
  return 'records' in data && Array.isArray(data.records);
}

// 判断是否为多驾驶员G1结果
function isMultiDriverG1Result(result: unknown): result is MultiDriverG1Result {
  return result !== null && typeof result === 'object' && 'drivers' in result && Array.isArray((result as { drivers: unknown }).drivers) && 'summary' in result;
}

export default function G1StartDateValidation({ 
  documents, 
  onResultChange, 
  shouldValidate = false, 
  validationKey = 0 
}: BusinessRuleProps) {
  const [result, setResult] = useState<BusinessRuleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const onResultChangeRef = useRef(onResultChange);
  
  // 更新ref以避免stale closure
  useEffect(() => {
    onResultChangeRef.current = onResultChange;
  }, [onResultChange]);

  // 当shouldValidate变为false时，清空结果
  useEffect(() => {
    if (!shouldValidate) {
      setResult(null);
    }
  }, [shouldValidate]);

  useEffect(() => {
    // 只有在shouldValidate为true时才开始验证
    if (!shouldValidate) {
      return;
    }

    const validateRule = async () => {
      setLoading(true);
      
      try {
        // 准备API请求数据
        const mvr = documents.mvr as (MvrData | MvrMultiData) | undefined;
        const quote = documents.quote as QuoteData | undefined;

        // 准备MVR驾驶员数据
        const mvrRecords: Array<{
          name: string | null;
          licence_number: string | null;
          date_of_birth: string | null;
          expiry_date: string | null;
          issue_date: string | null;
        }> = [];

        if (mvr) {
          if (isMvrMultiData(mvr)) {
            // 多个MVR记录
            mvr.records.forEach(record => {
              mvrRecords.push({
                name: record.name,
                licence_number: record.licence_number,
                date_of_birth: record.date_of_birth,
                expiry_date: record.expiry_date,
                issue_date: record.issue_date
              });
            });
          } else {
            // 单个MVR记录
            mvrRecords.push({
              name: mvr.name,
              licence_number: mvr.licence_number,
              date_of_birth: mvr.date_of_birth,
              expiry_date: mvr.expiry_date,
              issue_date: mvr.issue_date
            });
          }
        }

        // 准备Quote驾驶员数据
        const quoteDrivers: Array<{
          name: string;
          licence_number: string;
          date_g1: string | null;
        }> = [];

        if (quote?.vehicles && Array.isArray(quote.vehicles)) {
          // 从多车辆中收集所有驾驶员
          quote.vehicles.forEach(vehicle => {
            if (vehicle.drivers && Array.isArray(vehicle.drivers)) {
              vehicle.drivers.forEach(driver => {
                // 避免重复添加同一个驾驶员
                const existingDriver = quoteDrivers.find(qd => 
                  qd.name === driver.name && qd.licence_number === driver.licence_number
                );
                
                if (!existingDriver && driver.name && driver.licence_number) {
                  quoteDrivers.push({
                    name: driver.name,
                    licence_number: driver.licence_number,
                    date_g1: driver.date_g1
                  });
                }
              });
            }
          });
        }

        // 构建请求数据
        const requestData: {
          mvr?: {
            name?: string | null;
            licence_number?: string | null;
            date_of_birth?: string | null;
            expiry_date?: string | null;
            issue_date?: string | null;
            records?: Array<{
              name: string | null;
              licence_number: string | null;
              date_of_birth: string | null;
              expiry_date: string | null;
              issue_date: string | null;
            }>;
          };
          quote?: {
            date_g1?: string | null;
            drivers?: Array<{
              name: string;
              licence_number: string;
              date_g1: string | null;
            }>;
          };
        } = {};

        if (mvrRecords.length > 0) {
          if (mvrRecords.length === 1) {
            // 向后兼容：单个驾驶员使用旧格式
            const singleMvr = mvrRecords[0];
            requestData.mvr = {
              name: singleMvr.name,
              licence_number: singleMvr.licence_number,
              date_of_birth: singleMvr.date_of_birth,
              expiry_date: singleMvr.expiry_date,
              issue_date: singleMvr.issue_date
            };
          } else {
            // 多个驾驶员使用新格式
            requestData.mvr = {
              records: mvrRecords
            };
          }
        }

        if (quoteDrivers.length > 0) {
          if (quoteDrivers.length === 1 && mvrRecords.length === 1) {
            // 向后兼容：单个驾驶员使用旧格式
            requestData.quote = {
              date_g1: quoteDrivers[0].date_g1
            };
          } else {
            // 多个驾驶员使用新格式
            requestData.quote = {
              drivers: quoteDrivers
            };
          }
        }

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
  }, [documents, shouldValidate, validationKey]);

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
  
  // 检查是否为多驾驶员结果
  const isMultiDriver = isMultiDriverG1Result(result.result);
  
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
        {isMultiDriver && result.result ? (
          <div className="mt-3 space-y-3">
            {(result.result as MultiDriverG1Result).drivers.map((driver, index) => (
              <div key={index} className="text-sm">
                <div className="font-medium mb-2">{driver.driver_name || `Driver ${index + 1}`}</div>
                
                <div className="text-xs">
                  {driver.mvr_calculated_g1_date ? (
                    <div><strong>MVR Calculated G1:</strong> {driver.mvr_calculated_g1_date}</div>
                  ) : (
                    <div><strong>MVR Calculated G1:</strong> Not available</div>
                  )}
                  
                  {driver.quote_g1_date ? (
                    <div><strong>Quote G1:</strong> {driver.quote_g1_date}</div>
                  ) : (
                    <div><strong>Quote G1:</strong> Not found</div>
                  )}
                  
                  {driver.mvr_calculated_g1_date && driver.quote_g1_date && (
                    <div className="mt-1">
                      <strong>Match:</strong> 
                      <span className={`ml-1 ${driver.dates_match ? 'text-green-600' : 'text-red-600'}`}>
                        {driver.dates_match ? 'Yes' : 'No'}
                      </span>
                      {driver.date_difference_days !== null && (
                        <span className="ml-2 text-gray-600">
                          (Difference: {driver.date_difference_days} days)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* 单驾驶员结果显示（向后兼容） */
          result.result && (
            <div className="mt-3 text-xs">
              {(result.result as G1StartDateResult).mvr_calculated_g1_date ? (
                <div><strong>MVR Calculated G1:</strong> {(result.result as G1StartDateResult).mvr_calculated_g1_date}</div>
              ) : (
                <div><strong>MVR Calculated G1:</strong> Not available</div>
              )}
              
              {(result.result as G1StartDateResult).quote_g1_date ? (
                <div><strong>Quote G1:</strong> {(result.result as G1StartDateResult).quote_g1_date}</div>
              ) : (
                <div><strong>Quote G1:</strong> Not found</div>
              )}
              
              {(result.result as G1StartDateResult).mvr_calculated_g1_date && (result.result as G1StartDateResult).quote_g1_date && (
                <div className="mt-1">
                  <strong>Match:</strong> 
                  <span className={`ml-1 ${(result.result as G1StartDateResult).dates_match ? 'text-green-600' : 'text-red-600'}`}>
                    {(result.result as G1StartDateResult).dates_match ? 'Yes' : 'No'}
                  </span>
                  {(result.result as G1StartDateResult).date_difference_days !== null && (
                    <span className="ml-2 text-gray-600">
                      (Difference: {(result.result as G1StartDateResult).date_difference_days} days)
                    </span>
                  )}
                </div>
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