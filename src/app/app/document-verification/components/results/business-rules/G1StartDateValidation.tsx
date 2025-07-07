'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG, G1StartDateResult } from './types';
import { MvrData, MvrMultiData, QuoteData, AutoPlusData, AutoPlusMultiData } from '../../../types';

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
        // 准备API请求数据 - 支持多文件数据
        const mvr = documents.mvr as unknown as MvrData | MvrMultiData | undefined;
        const quote = documents.quote as unknown as QuoteData | undefined;
        const autoplus = documents.autoplus as unknown as AutoPlusData | AutoPlusMultiData | undefined;

        // 检查是否为多文件数据
        const isMvrMulti = mvr && 'records' in mvr && Array.isArray(mvr.records);
        const isAutoPlusMulti = autoplus && 'records' in autoplus && Array.isArray(autoplus.records);

        const requestData = {
          mvr: mvr ? {
            // 单文件数据
            date_of_birth: isMvrMulti ? undefined : (mvr as MvrData).date_of_birth,
            expiry_date: isMvrMulti ? undefined : (mvr as MvrData).expiry_date,
            issue_date: isMvrMulti ? undefined : (mvr as MvrData).issue_date,
            name: isMvrMulti ? undefined : (mvr as MvrData).name,
            licence_number: isMvrMulti ? undefined : (mvr as MvrData).licence_number,
            // 多文件数据
            records: isMvrMulti ? (mvr as MvrMultiData).records.map((record, index) => ({
              file_id: record.file_id || `mvr_${index}`,
              file_name: record.file_name,
              date_of_birth: record.date_of_birth,
              expiry_date: record.expiry_date,
              issue_date: record.issue_date,
              name: record.name,
              licence_number: record.licence_number
            })) : undefined
          } : undefined,
          quote: quote ? {
            // 单驾驶员兼容字段
            date_g1: quote.date_g1,
            date_g2: quote.date_g2,
            date_g: quote.date_g,
            date_insured: quote.date_insured,
            date_with_company: quote.date_with_company,
            name: quote.name,
            licence_number: quote.licence_number,
            // 多驾驶员数据
            vehicles: quote.vehicles
          } : undefined,
          autoplus: autoplus ? {
            // 单文件数据
            first_insurance_date: isAutoPlusMulti ? undefined : (autoplus as AutoPlusData).first_insurance_date,
            name: isAutoPlusMulti ? undefined : (autoplus as AutoPlusData).name,
            licence_number: isAutoPlusMulti ? undefined : (autoplus as AutoPlusData).licence_number,
            // 多文件数据
            records: isAutoPlusMulti ? (autoplus as AutoPlusMultiData).records.map((record, index) => ({
              file_id: record.file_id || `autoplus_${index}`,
              file_name: record.file_name,
              first_insurance_date: record.first_insurance_date,
              name: record.name,
              licence_number: record.licence_number
            })) : undefined
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
            
            {/* 统计信息 */}
            {g1Result.summary && (
              <div className="mt-2 p-3 bg-gray-50 rounded border">
                <h5 className="font-medium text-sm text-gray-900 mb-2">Validation Summary</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div><strong>Total Drivers:</strong> {g1Result.summary.total_drivers}</div>
                  <div><strong>MVR Records:</strong> {g1Result.summary.total_mvr_records}</div>
                  <div><strong>Auto+ Records:</strong> {g1Result.summary.total_autoplus_records}</div>
                  <div><strong>Issues Found:</strong> {g1Result.summary.drivers_with_issues}</div>
                  <div><strong>Warnings:</strong> {g1Result.summary.drivers_with_warnings}</div>
                  <div><strong>Unmatched Drivers:</strong> {g1Result.summary.unmatched_drivers}</div>
                  <div><strong>Unmatched MVR:</strong> {g1Result.summary.unmatched_mvr_records}</div>
                  <div><strong>Unmatched Auto+:</strong> {g1Result.summary.unmatched_autoplus_records}</div>
                </div>
              </div>
            )}

            {/* 多驾驶员验证结果 */}
            {g1Result.driver_validations && g1Result.driver_validations.length > 0 && (
              <div className="mt-4 space-y-4">
                <h5 className="font-medium text-sm text-gray-900">Individual Driver Validations</h5>
                {g1Result.driver_validations.map((driverValidation, index) => (
                  <div key={index} className="border border-gray-200 rounded p-3 bg-gray-50">
                    {/* 驾驶员信息 */}
                    <div className="flex items-center justify-between mb-3">
                      <h6 className="font-medium text-sm text-gray-900">
                        {driverValidation.driver_name}
                        {driverValidation.driver_license_number && (
                          <span className="ml-2 text-xs text-gray-600">
                            ({driverValidation.driver_license_number})
                          </span>
                        )}
                      </h6>
                      <div className="flex space-x-2">
                        {driverValidation.validation_result.issues.length > 0 && (
                          <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                            {driverValidation.validation_result.issues.length} Issue(s)
                          </span>
                        )}
                        {driverValidation.validation_result.warnings.length > 0 && (
                          <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                            {driverValidation.validation_result.warnings.length} Warning(s)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* MVR匹配结果 */}
                    {driverValidation.mvr_matches && driverValidation.mvr_matches.length > 0 && (
                      <div className="mb-3">
                        <h6 className="font-medium text-xs text-blue-900 mb-2">MVR Matches ({driverValidation.mvr_matches.length})</h6>
                        <div className="space-y-2">
                          {driverValidation.mvr_matches.map((mvrMatch, mvrIndex) => (
                            <div key={mvrIndex} className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50 rounded">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div><strong>File:</strong> {mvrMatch.mvr_file_name || mvrMatch.mvr_record_id}</div>
                                <div><strong>Calculated G1:</strong> {mvrMatch.calculated_g1_date || 'N/A'}</div>
                                <div><strong>Method:</strong> {mvrMatch.calculation_method || 'N/A'}</div>
                                <div><strong>Birth Date:</strong> {mvrMatch.birth_date || 'N/A'}</div>
                                <div><strong>Expiry Date:</strong> {mvrMatch.expiry_date || 'N/A'}</div>
                                {mvrMatch.issue_date && mvrMatch.issue_date !== 'N/A' && (
                                  <div><strong>Issue Date:</strong> {mvrMatch.issue_date}</div>
                                )}
                              </div>
                              <div className="mt-2 flex space-x-4 text-xs">
                                <span className={`px-2 py-1 rounded ${mvrMatch.name_match ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  Name: {mvrMatch.name_match ? 'Match' : 'No Match'}
                                </span>
                                <span className={`px-2 py-1 rounded ${mvrMatch.license_number_match ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  License: {mvrMatch.license_number_match ? 'Match' : 'No Match'}
                                </span>
                                {mvrMatch.birth_date_match !== null && (
                                  <span className={`px-2 py-1 rounded ${mvrMatch.birth_date_match ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    Birth Date: {mvrMatch.birth_date_match ? 'Match' : 'No Match'}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Auto+匹配结果 */}
                    {driverValidation.autoplus_matches && driverValidation.autoplus_matches.length > 0 && (
                      <div className="mb-3">
                        <h6 className="font-medium text-xs text-green-900 mb-2">Auto+ Matches ({driverValidation.autoplus_matches.length})</h6>
                        <div className="space-y-2">
                          {driverValidation.autoplus_matches.map((autoPlusMatch, autoPlusIndex) => (
                            <div key={autoPlusIndex} className="border-l-4 border-green-500 pl-3 py-2 bg-green-50 rounded">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div><strong>File:</strong> {autoPlusMatch.autoplus_file_name || autoPlusMatch.autoplus_record_id}</div>
                                <div><strong>First Insurance Date:</strong> {autoPlusMatch.first_insurance_date || 'N/A'}</div>
                              </div>
                              <div className="mt-2 flex space-x-4 text-xs">
                                <span className={`px-2 py-1 rounded ${autoPlusMatch.name_match ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  Name: {autoPlusMatch.name_match ? 'Match' : 'No Match'}
                                </span>
                                <span className={`px-2 py-1 rounded ${autoPlusMatch.license_number_match ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  License: {autoPlusMatch.license_number_match ? 'Match' : 'No Match'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quote驾照日期 */}
                    {driverValidation.quote_license_dates && (
                      <div className="mb-3">
                        <h6 className="font-medium text-xs text-purple-900 mb-2">Quote License Dates</h6>
                        <div className="border-l-4 border-purple-500 pl-3 py-2 bg-purple-50 rounded">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            <div><strong>G1:</strong> {driverValidation.quote_license_dates.date_g1 || 'N/A'}</div>
                            <div><strong>G2:</strong> {driverValidation.quote_license_dates.date_g2 || 'N/A'}</div>
                            <div><strong>G:</strong> {driverValidation.quote_license_dates.date_g || 'N/A'}</div>
                            <div><strong>Date Insured:</strong> {driverValidation.quote_license_dates.date_insured || 'N/A'}</div>
                            <div><strong>Date with Company:</strong> {driverValidation.quote_license_dates.date_with_company || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 10年规则验证 */}
                    {driverValidation.validation_result.ten_year_rule_triggered && (
                      <div className="mb-3">
                        <div className="border-l-4 border-red-500 pl-3 py-2 bg-red-50 rounded">
                          <h6 className="font-medium text-xs text-red-900 mb-2">10-Year Rule Triggered</h6>
                          <div className="text-xs text-red-800">
                            {driverValidation.validation_result.license_insurance_years_diff !== null && driverValidation.validation_result.license_insurance_years_diff !== undefined && (
                              <div><strong>Years Difference:</strong> {driverValidation.validation_result.license_insurance_years_diff.toFixed(1)} years</div>
                            )}
                            <div className="mt-1 text-red-700">
                              ⚠️ Driver&apos;s License History must be obtained to verify license dates
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 验证结果状态 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                      <div className={`px-2 py-1 rounded ${driverValidation.validation_result.g1_calculation_successful ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        G1 Calculation: {driverValidation.validation_result.g1_calculation_successful ? 'Success' : 'Failed'}
                      </div>
                      <div className={`px-2 py-1 rounded ${driverValidation.validation_result.g1_dates_consistent ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        G1 Dates: {driverValidation.validation_result.g1_dates_consistent ? 'Consistent' : 'Inconsistent'}
                      </div>
                      <div className={`px-2 py-1 rounded ${driverValidation.validation_result.ten_year_rule_triggered ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        10-Year Rule: {driverValidation.validation_result.ten_year_rule_triggered ? 'Triggered' : 'OK'}
                      </div>
                    </div>

                    {/* 问题和警告 */}
                    {(driverValidation.validation_result.issues.length > 0 || driverValidation.validation_result.warnings.length > 0) && (
                      <div className="mt-3 space-y-2">
                        {driverValidation.validation_result.issues.length > 0 && (
                          <div className="p-2 bg-red-100 border border-red-300 rounded">
                            <div className="font-medium text-xs text-red-800 mb-1">Issues:</div>
                            <ul className="text-xs text-red-700 space-y-1">
                              {driverValidation.validation_result.issues.map((issue, issueIndex) => (
                                <li key={issueIndex}>• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {driverValidation.validation_result.warnings.length > 0 && (
                          <div className="p-2 bg-yellow-100 border border-yellow-300 rounded">
                            <div className="font-medium text-xs text-yellow-800 mb-1">Warnings:</div>
                            <ul className="text-xs text-yellow-700 space-y-1">
                              {driverValidation.validation_result.warnings.map((warning, warningIndex) => (
                                <li key={warningIndex}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 建议 */}
                    {driverValidation.validation_result.recommendations.length > 0 && (
                      <div className="mt-3 p-2 bg-blue-100 border border-blue-300 rounded">
                        <div className="font-medium text-xs text-blue-800 mb-1">Recommendations:</div>
                        <ul className="text-xs text-blue-700 space-y-1">
                          {driverValidation.validation_result.recommendations.map((recommendation, recIndex) => (
                            <li key={recIndex}>• {recommendation}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 兼容性：保留原有的单驾驶员显示（如果没有多驾驶员数据） */}
            {(!g1Result.driver_validations || g1Result.driver_validations.length === 0) && (
              <div className="mt-2 space-y-3">
                {/* MVR计算结果 */}
                <div className="border-l-4 border-blue-500 pl-3">
                  <h5 className="font-medium text-sm text-blue-900">MVR G1 Calculation</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
                    <div><strong>Calculated G1 Date:</strong> {g1Result.mvr_calculated_g1_date}</div>
                    <div><strong>Method:</strong> {g1Result.calculation_method}</div>
                    <div><strong>Birth Date:</strong> {g1Result.birth_date}</div>
                    <div><strong>Expiry Date:</strong> {g1Result.expiry_date}</div>
                    {g1Result.issue_date !== 'N/A' && (
                      <div><strong>Issue Date:</strong> {g1Result.issue_date}</div>
                    )}
                  </div>
                </div>
                
                {/* Quote对比结果 */}
                {g1Result.quote_g1_date !== 'N/A' && (
                  <div className="border-l-4 border-green-500 pl-3">
                    <h5 className="font-medium text-sm text-green-900">Quote G1 Comparison</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
                      <div><strong>Quote G1 Date:</strong> {g1Result.quote_g1_date}</div>
                      <div><strong>Dates Match:</strong> {g1Result.g1_dates_match ? 'Yes' : 'No'}</div>
                      {g1Result.quote_g2_date !== 'N/A' && (
                        <div><strong>Quote G2 Date:</strong> {g1Result.quote_g2_date}</div>
                      )}
                      {g1Result.quote_g_date !== 'N/A' && (
                        <div><strong>Quote G Date:</strong> {g1Result.quote_g_date}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 10年规则验证 */}
                {g1Result.first_insurance_date !== 'N/A' && (
                  <div className={`border-l-4 ${g1Result.ten_year_rule_triggered ? 'border-red-500' : 'border-yellow-500'} pl-3`}>
                    <h5 className={`font-medium text-sm ${g1Result.ten_year_rule_triggered ? 'text-red-900' : 'text-yellow-900'}`}>
                      10-Year Rule Verification
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
                      <div><strong>First Insurance Date:</strong> {g1Result.first_insurance_date}</div>
                      <div><strong>License Date:</strong> {g1Result.quote_g2_date !== 'N/A' ? g1Result.quote_g2_date : g1Result.quote_g_date}</div>
                      {g1Result.license_insurance_years_diff !== null && g1Result.license_insurance_years_diff !== undefined && (
                        <div><strong>Years Difference:</strong> {(g1Result.license_insurance_years_diff as number).toFixed(1)} years</div>
                      )}
                      <div><strong>10-Year Rule Triggered:</strong> {g1Result.ten_year_rule_triggered ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                )}
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