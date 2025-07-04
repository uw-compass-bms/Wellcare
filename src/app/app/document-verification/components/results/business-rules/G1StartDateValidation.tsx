'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RuleStatus, RULE_STATUS_CONFIG, formatDate, getMonthDay, subtractYears, getYearsDifference, datesAreClose } from './types';
import { MvrData, QuoteData, AutoPlusData } from '../../../types';

export default function G1StartDateValidation({ documents, onResultChange }: BusinessRuleProps) {
  const [result, setResult] = useState<BusinessRuleResult | null>(null);
  const onResultChangeRef = useRef(onResultChange);
  
  // 更新ref以避免stale closure
  useEffect(() => {
    onResultChangeRef.current = onResultChange;
  }, [onResultChange]);

  useEffect(() => {
    const validateRule = () => {
      const mvr = documents.mvr as MvrData;
      const quote = documents.quote as QuoteData;
      const autoplus = documents.autoplus as AutoPlusData;

      // 检查必要数据是否存在
      if (!mvr || !mvr.date_of_birth || !mvr.expiry_date) {
        const insufficientDataResult: BusinessRuleResult = {
          id: 'g1_start_date',
          name: 'G1 Start Date Validation & Cross-Document Verification',
          status: 'insufficient_data',
          recommendation: 'Upload complete MVR document with Birth Date and Expiry Date',
          details: 'Missing required MVR data: Birth Date or Expiry Date not found',
          data_sources: ['MVR']
        };
        setResult(insufficientDataResult);
        onResultChangeRef.current?.(insufficientDataResult);
        return;
      }

      // 获取所有相关数据
      const birthDate = mvr.date_of_birth;
      const expiryDate = mvr.expiry_date;
      const issueDate = mvr.issue_date;
      const quoteG1Date = quote?.date_g1;
      const quoteG2Date = quote?.date_g2;
      const quoteGDate = quote?.date_g;
      const firstInsuranceDate = autoplus?.first_insurance_date;

      // 第一步：计算MVR的G1日期（保持原有逻辑）
      const birthMonthDay = getMonthDay(birthDate);
      const expiryMonthDay = getMonthDay(expiryDate);
      let calculatedG1Date: string | null = null;
      let calculationMethod = '';
      let g1CalculationValid = false;

      if (birthMonthDay && expiryMonthDay && birthMonthDay === expiryMonthDay) {
        // 月日一致：使用Issue Date作为G1起始时间
        if (issueDate) {
          calculatedG1Date = issueDate;
          calculationMethod = 'Used Issue Date (Birth Date and Expiry Date have matching month/day)';
          g1CalculationValid = true;
        }
      } else {
        // 月日不一致：到期日减去5年
        calculatedG1Date = subtractYears(expiryDate, 5);
        calculationMethod = 'Expiry Date minus 5 years (Birth Date and Expiry Date have different month/day)';
        
        if (calculatedG1Date) {
          // 验证推算的G1日期是否合理（应该在16岁之后）
          const birthYear = new Date(birthDate).getFullYear();
          const calculatedYear = new Date(calculatedG1Date).getFullYear();
          const ageAtG1 = calculatedYear - birthYear;
          g1CalculationValid = ageAtG1 >= 16 && ageAtG1 <= 25;
        }
      }

      // 第二步：跨文档日期对比
      const issues: string[] = [];
      const warnings: string[] = [];
      const successes: string[] = [];
      const dataSources: string[] = ['MVR'];

      // MVR G1日期计算结果
      if (g1CalculationValid && calculatedG1Date) {
        successes.push(`MVR G1 date calculated successfully: ${formatDate(calculatedG1Date)}`);
      } else {
        issues.push('MVR G1 date calculation failed or unreasonable');
      }

      // Quote G1日期对比
      if (quoteG1Date && calculatedG1Date) {
        dataSources.push('Quote');
        if (datesAreClose(calculatedG1Date, quoteG1Date)) {
          successes.push(`Quote G1 date matches MVR calculated G1 date (${formatDate(quoteG1Date)})`);
        } else {
          warnings.push(`Quote G1 date (${formatDate(quoteG1Date)}) differs from MVR calculated G1 date (${formatDate(calculatedG1Date)})`);
        }
      } else if (quoteG1Date) {
        dataSources.push('Quote');
        warnings.push('Quote G1 date available but MVR G1 calculation failed');
      }

      // 第三步：10年规则验证
      let tenYearRuleTriggered = false;
      if (firstInsuranceDate && autoplus) {
        dataSources.push('Auto+');
        
        // 确定G2/G日期（优先使用G2，如果没有则使用G）
        const licenseDate = quoteG2Date || quoteGDate;
        
        if (licenseDate) {
          const yearsDiff = getYearsDifference(licenseDate, firstInsuranceDate);
          
          if (yearsDiff !== null && yearsDiff >= 10) {
            tenYearRuleTriggered = true;
            issues.push(`G2/G license date (${formatDate(licenseDate)}) is ${yearsDiff.toFixed(1)} years earlier than first insurance date (${formatDate(firstInsuranceDate)}) - Driver's License History must be obtained to verify license dates`);
          } else if (yearsDiff !== null) {
            successes.push(`G2/G license date (${formatDate(licenseDate)}) and first insurance date (${formatDate(firstInsuranceDate)}) are within acceptable range (${yearsDiff.toFixed(1)} years)`);
          }
        } else {
          warnings.push('G2/G license date not available from Quote - cannot verify 10-year rule');
        }
      }

      // 第四步：确定最终状态和建议
      let finalStatus: RuleStatus;
      let recommendation: string;
      let details: string;

      if (issues.length > 0) {
        finalStatus = 'failed';
        if (tenYearRuleTriggered) {
          recommendation = 'Driver\'s License History must be obtained to verify the license dates';
        } else {
          recommendation = 'Contact customer to confirm actual G1 acquisition date or provide Driver\'s License History';
        }
        details = issues.join('. ') + (warnings.length > 0 ? '. Additional warnings: ' + warnings.join('. ') : '');
      } else if (warnings.length > 0) {
        finalStatus = 'requires_review';
        recommendation = 'Review date discrepancies and consider contacting customer for clarification';
        details = warnings.join('. ') + (successes.length > 0 ? '. Successful validations: ' + successes.join('. ') : '');
      } else {
        finalStatus = 'passed';
        recommendation = 'No further action required. All G1 date validations passed.';
        details = successes.join('. ');
      }

      const ruleResult: BusinessRuleResult = {
        id: 'g1_start_date',
        name: 'G1 Start Date Validation & Cross-Document Verification',
        status: finalStatus,
        result: {
          mvr_calculated_g1_date: formatDate(calculatedG1Date),
          calculation_method: calculationMethod,
          quote_g1_date: formatDate(quoteG1Date),
          quote_g2_date: formatDate(quoteG2Date),
          quote_g_date: formatDate(quoteGDate),
          first_insurance_date: formatDate(firstInsuranceDate),
          birth_date: formatDate(birthDate),
          expiry_date: formatDate(expiryDate),
          issue_date: formatDate(issueDate),
          ten_year_rule_triggered: tenYearRuleTriggered,
          g1_dates_match: calculatedG1Date && quoteG1Date ? datesAreClose(calculatedG1Date, quoteG1Date) : null,
          license_insurance_years_diff: firstInsuranceDate && (quoteG2Date || quoteGDate) ? 
            getYearsDifference(quoteG2Date || quoteGDate!, firstInsuranceDate) : null
        },
        recommendation,
        details,
        data_sources: dataSources
      };

      setResult(ruleResult);
      onResultChangeRef.current?.(ruleResult);
    };

    validateRule();
  }, [documents]); // 移除onResultChange依赖，使用ref避免无限循环

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
                  <div><strong>Calculated G1 Date:</strong> {result.result.mvr_calculated_g1_date}</div>
                  <div><strong>Method:</strong> {result.result.calculation_method}</div>
                  <div><strong>Birth Date:</strong> {result.result.birth_date}</div>
                  <div><strong>Expiry Date:</strong> {result.result.expiry_date}</div>
                  {result.result.issue_date !== 'N/A' && (
                    <div><strong>Issue Date:</strong> {result.result.issue_date}</div>
                  )}
                </div>
              </div>
              
              {/* Quote对比结果 */}
              {result.result.quote_g1_date !== 'N/A' && (
                <div className="border-l-4 border-green-500 pl-3">
                  <h5 className="font-medium text-sm text-green-900">Quote G1 Comparison</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
                    <div><strong>Quote G1 Date:</strong> {result.result.quote_g1_date}</div>
                    <div><strong>Dates Match:</strong> {result.result.g1_dates_match ? 'Yes' : 'No'}</div>
                    {result.result.quote_g2_date !== 'N/A' && (
                      <div><strong>Quote G2 Date:</strong> {result.result.quote_g2_date}</div>
                    )}
                    {result.result.quote_g_date !== 'N/A' && (
                      <div><strong>Quote G Date:</strong> {result.result.quote_g_date}</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 10年规则验证 */}
              {result.result.first_insurance_date !== 'N/A' && (
                <div className={`border-l-4 ${result.result.ten_year_rule_triggered ? 'border-red-500' : 'border-yellow-500'} pl-3`}>
                  <h5 className={`font-medium text-sm ${result.result.ten_year_rule_triggered ? 'text-red-900' : 'text-yellow-900'}`}>
                    10-Year Rule Verification
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
                    <div><strong>First Insurance Date:</strong> {result.result.first_insurance_date}</div>
                    <div><strong>License Date:</strong> {result.result.quote_g2_date !== 'N/A' ? result.result.quote_g2_date : result.result.quote_g_date}</div>
                    {result.result.license_insurance_years_diff !== null && (
                      <div><strong>Years Difference:</strong> {result.result.license_insurance_years_diff.toFixed(1)} years</div>
                    )}
                    <div><strong>10-Year Rule Triggered:</strong> {result.result.ten_year_rule_triggered ? 'Yes' : 'No'}</div>
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