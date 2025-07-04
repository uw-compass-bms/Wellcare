'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG, formatDate, getMonthDay, subtractYears } from './types';
import { MvrData } from '../../../types';

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

      // 检查必要数据是否存在
      if (!mvr || !mvr.date_of_birth || !mvr.expiry_date) {
        const insufficientDataResult: BusinessRuleResult = {
          id: 'g1_start_date',
          name: 'G1 Start Date Calculation',
          status: 'insufficient_data',
          recommendation: 'Upload complete MVR document with Birth Date and Expiry Date',
          details: 'Missing required MVR data: Birth Date or Expiry Date not found',
          data_sources: ['MVR']
        };
        setResult(insufficientDataResult);
        onResultChangeRef.current?.(insufficientDataResult);
        return;
      }

      // 获取MVR数据
      const birthDate = mvr.date_of_birth;
      const expiryDate = mvr.expiry_date;
      const issueDate = mvr.issue_date;

      // 获取生日和到期日的月日部分
      const birthMonthDay = getMonthDay(birthDate);
      const expiryMonthDay = getMonthDay(expiryDate);

      let calculatedG1Date: string | null = null;
      let calculationMethod = '';
      let ruleResult: BusinessRuleResult;

      if (birthMonthDay && expiryMonthDay && birthMonthDay === expiryMonthDay) {
        // 月日一致：使用Issue Date作为G1起始时间
        if (issueDate) {
          calculatedG1Date = issueDate;
          calculationMethod = 'Used Issue Date (Birth Date and Expiry Date have matching month/day)';
          
          ruleResult = {
            id: 'g1_start_date',
            name: 'G1 Start Date Calculation',
            status: 'passed',
            result: {
              calculated_g1_date: formatDate(calculatedG1Date),
              method: calculationMethod,
              birth_date: formatDate(birthDate),
              expiry_date: formatDate(expiryDate),
              issue_date: formatDate(issueDate)
            },
            recommendation: 'No further action required. G1 start date successfully calculated.',
            details: `Birth Date (${formatDate(birthDate)}) and Expiry Date (${formatDate(expiryDate)}) have matching month/day. Using Issue Date (${formatDate(issueDate)}) as G1 start date.`,
            data_sources: ['MVR']
          };
        } else {
          ruleResult = {
            id: 'g1_start_date',
            name: 'G1 Start Date Calculation',
            status: 'failed',
            recommendation: 'Contact customer to confirm actual G1 acquisition date or provide Driver\'s Licence History',
            details: `Birth Date (${formatDate(birthDate)}) and Expiry Date (${formatDate(expiryDate)}) have matching month/day, but Issue Date is missing from MVR.`,
            data_sources: ['MVR']
          };
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
          
          if (ageAtG1 >= 16 && ageAtG1 <= 25) { // 合理的G1考取年龄范围
            ruleResult = {
              id: 'g1_start_date',
              name: 'G1 Start Date Calculation',
              status: 'passed',
              result: {
                calculated_g1_date: formatDate(calculatedG1Date),
                method: calculationMethod,
                birth_date: formatDate(birthDate),
                expiry_date: formatDate(expiryDate),
                age_at_g1: ageAtG1
              },
              recommendation: 'No further action required. G1 start date successfully calculated.',
              details: `Birth Date (${formatDate(birthDate)}) and Expiry Date (${formatDate(expiryDate)}) have different month/day. Calculated G1 start date: ${formatDate(calculatedG1Date)} (age ${ageAtG1}).`,
              data_sources: ['MVR']
            };
          } else {
            ruleResult = {
              id: 'g1_start_date',
              name: 'G1 Start Date Calculation',
              status: 'failed',
              result: {
                calculated_g1_date: formatDate(calculatedG1Date),
                method: calculationMethod,
                birth_date: formatDate(birthDate),
                expiry_date: formatDate(expiryDate),
                age_at_g1: ageAtG1
              },
              recommendation: 'Contact customer to confirm actual G1 acquisition date or provide Driver\'s Licence History',
              details: `Calculated G1 start date (${formatDate(calculatedG1Date)}) results in unreasonable age at G1 acquisition (${ageAtG1} years old). Please verify data.`,
              data_sources: ['MVR']
            };
          }
        } else {
          ruleResult = {
            id: 'g1_start_date',
            name: 'G1 Start Date Calculation',
            status: 'failed',
            recommendation: 'Contact customer to confirm actual G1 acquisition date or provide Driver\'s Licence History',
            details: 'Failed to calculate G1 start date from Expiry Date',
            data_sources: ['MVR']
          };
        }
      }

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
            <strong>Calculation Result:</strong>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div><strong>Calculated G1 Date:</strong> {result.result.calculated_g1_date}</div>
              <div><strong>Method:</strong> {result.result.method}</div>
              <div><strong>Birth Date:</strong> {result.result.birth_date}</div>
              <div><strong>Expiry Date:</strong> {result.result.expiry_date}</div>
              {result.result.issue_date && (
                <div><strong>Issue Date:</strong> {result.result.issue_date}</div>
              )}
              {result.result.age_at_g1 && (
                <div><strong>Age at G1:</strong> {result.result.age_at_g1} years</div>
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