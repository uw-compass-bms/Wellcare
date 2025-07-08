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
        
        {isMultiDriver && result.result ? (
          // 多驾驶员结果显示
          <div className="mt-3 p-3 bg-white rounded border">
            <div className="mb-4">
              <strong>Multi-Driver Validation Summary:</strong>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-bold text-blue-800">{(result.result as MultiDriverG1Result).summary.total_drivers}</div>
                  <div className="text-blue-600">Total</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-bold text-green-800">{(result.result as MultiDriverG1Result).summary.passed_validations}</div>
                  <div className="text-green-600">Passed</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <div className="font-bold text-red-800">{(result.result as MultiDriverG1Result).summary.failed_validations}</div>
                  <div className="text-red-600">Failed</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="font-bold text-yellow-800">{(result.result as MultiDriverG1Result).summary.requires_review}</div>
                  <div className="text-yellow-600">Review</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-bold text-gray-800">{(result.result as MultiDriverG1Result).summary.matched_drivers}</div>
                  <div className="text-gray-600">Matched</div>
                </div>
              </div>
            </div>
            
            {/* 每个驾驶员的详细结果 */}
            <div className="space-y-4">
              <strong>Individual Driver Results:</strong>
              {(result.result as MultiDriverG1Result).drivers.map((driver, index) => {
                const driverConfig = RULE_STATUS_CONFIG[driver.driver_status];
                return (
                  <div key={index} className={`border rounded-lg p-3 ${driverConfig.bgColor} ${driverConfig.borderColor}`}>
                    {/* 驾驶员标题 */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-bold ${driverConfig.color}`}>{driverConfig.icon}</span>
                        <h5 className={`font-medium ${driverConfig.color}`}>{driver.driver_name}</h5>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* 匹配状态 */}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${{
                          'exact_match': 'bg-green-100 text-green-800 border border-green-300',
                          'partial_match': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
                          'no_match': 'bg-red-100 text-red-800 border border-red-300',
                          'no_quote_data': 'bg-gray-100 text-gray-800 border border-gray-300'
                        }[driver.match_status]}`}>
                          {driver.match_status.replace('_', ' ').toUpperCase()}
                        </span>
                        {/* 验证状态 */}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${driverConfig.color} ${driverConfig.bgColor} border ${driverConfig.borderColor}`}>
                          {driver.driver_status.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* 驾驶员详情 */}
                    <div className="space-y-3">
                      {/* 驾照信息 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <strong className="text-xs">MVR License:</strong>
                          <div className="text-xs">{driver.mvr_licence_number || 'N/A'}</div>
                        </div>
                        <div>
                          <strong className="text-xs">Quote License:</strong>
                          <div className="text-xs">{driver.quote_licence_number || 'N/A'}</div>
                        </div>
                      </div>

                      {/* MVR计算结果 */}
                      {driver.mvr_calculated_g1_date && (
                        <div className="border-l-4 border-blue-500 pl-2">
                          <strong className="text-xs text-blue-900">MVR G1 Calculation:</strong>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs mt-1">
                            <div><strong>Birth Date:</strong> {driver.birth_date || 'N/A'}</div>
                            <div><strong>Expiry Date:</strong> {driver.expiry_date || 'N/A'}</div>
                            <div><strong>Issue Date:</strong> {driver.issue_date || 'N/A'}</div>
                          </div>
                          <div className="text-xs mt-1">
                            <div><strong>Calculated G1:</strong> {driver.mvr_calculated_g1_date}</div>
                            <div><strong>Method:</strong> {driver.calculation_method}</div>
                          </div>
                        </div>
                      )}

                      {/* Quote对比结果 */}
                      {driver.quote_g1_date && (
                        <div className="border-l-4 border-green-500 pl-2">
                          <strong className="text-xs text-green-900">Quote G1 Comparison:</strong>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs mt-1">
                            <div><strong>Quote G1:</strong> {driver.quote_g1_date}</div>
                            <div><strong>MVR Calculated:</strong> {driver.mvr_calculated_g1_date || 'N/A'}</div>
                            <div><strong>Difference:</strong> {driver.date_difference_days !== null ? `${driver.date_difference_days} days` : 'N/A'}</div>
                          </div>
                          <div className="mt-1">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              driver.dates_match 
                                ? 'bg-green-100 text-green-800 border border-green-300' 
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}>
                              {driver.dates_match ? '✓ Dates Match' : '✗ Dates Don\'t Match'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* 驾驶员建议和详情 */}
                      <div className="text-xs">
                        <div><strong>Recommendation:</strong> {driver.driver_recommendation}</div>
                        <div><strong>Details:</strong> {driver.driver_details}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // 单驾驶员结果显示（向后兼容）
          result.result && (
            <div className="mt-3 p-3 bg-white rounded border">
              <strong>Validation Results:</strong>
              
              <div className="mt-2 space-y-3">
                {/* MVR计算结果 */}
                <div className="border-l-4 border-blue-500 pl-3">
                  <h5 className="font-medium text-sm text-blue-900 mb-2">MVR G1 Date Calculation</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div><strong>Birth Date:</strong> {(result.result as G1StartDateResult).birth_date || 'N/A'}</div>
                    <div><strong>Expiry Date:</strong> {(result.result as G1StartDateResult).expiry_date || 'N/A'}</div>
                    <div><strong>Issue Date:</strong> {(result.result as G1StartDateResult).issue_date || 'N/A'}</div>
                    <div><strong>Birth Month-Day:</strong> {(result.result as G1StartDateResult).birth_month_day || 'N/A'}</div>
                    <div><strong>Expiry Month-Day:</strong> {(result.result as G1StartDateResult).expiry_month_day || 'N/A'}</div>
                    <div><strong>Calculated G1 Date:</strong> {(result.result as G1StartDateResult).mvr_calculated_g1_date || 'N/A'}</div>
                  </div>
                  <div className="mt-2 text-xs text-blue-800">
                    <strong>Method:</strong> {(result.result as G1StartDateResult).calculation_method || 'N/A'}
                  </div>
                </div>
                
                {/* Quote对比结果 */}
                <div className="border-l-4 border-green-500 pl-3">
                  <h5 className="font-medium text-sm text-green-900 mb-2">Quote G1 Date Comparison</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    <div><strong>Quote G1 Date:</strong> {(result.result as G1StartDateResult).quote_g1_date || 'N/A'}</div>
                    <div><strong>MVR Calculated G1:</strong> {(result.result as G1StartDateResult).mvr_calculated_g1_date || 'N/A'}</div>
                    <div><strong>Dates Match:</strong> {(result.result as G1StartDateResult).dates_match ? 'Yes' : 'No'}</div>
                    <div><strong>Difference (Days):</strong> {(result.result as G1StartDateResult).date_difference_days !== null ? (result.result as G1StartDateResult).date_difference_days : 'N/A'}</div>
                  </div>
                  
                  {/* 日期匹配状态显示 */}
                  {(result.result as G1StartDateResult).mvr_calculated_g1_date && (result.result as G1StartDateResult).quote_g1_date && (
                    <div className="mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        (result.result as G1StartDateResult).dates_match 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}>
                        {(result.result as G1StartDateResult).dates_match ? '✓ Dates Match' : '✗ Dates Don\'t Match'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
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