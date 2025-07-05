'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG, NewDriverResult } from './types';
import { QuoteData, AutoPlusData } from '../../../types';

export default function NewDriverValidation({ documents, onResultChange }: BusinessRuleProps) {
  const [result, setResult] = useState<BusinessRuleResult | null>(null);
  const onResultChangeRef = useRef(onResultChange);

  // 避免闭包问题，更新ref
  useEffect(() => {
    onResultChangeRef.current = onResultChange;
  }, [onResultChange]);

  useEffect(() => {
    const validateRule = () => {
      // 优先从AutoPlus获取首次保险日期，否则从Quote获取相关保险日期
      // 安全地获取文档数据
      const autoplus = documents.autoplus as unknown as AutoPlusData | undefined;
      const quote = documents.quote as unknown as QuoteData | undefined;
      
      let insuranceDate: string | null = null;
      const dataSource: string[] = [];
      
      // 优先使用 AutoPlus 数据
      if (autoplus?.first_insurance_date) {
        insuranceDate = autoplus.first_insurance_date;
        dataSource.push('AutoPlus');
      }
      
      // 如果 AutoPlus 没有数据，尝试从 Quote 获取
      if (!insuranceDate && quote) {
        // 尝试多个可能的保险日期字段
        insuranceDate = quote.date_insured || quote.date_with_company || null;
        if (insuranceDate) {
          dataSource.push('Quote');
        }
      }

      let ruleResult: BusinessRuleResult;

      if (!insuranceDate) {
        // 没有保险历史数据，视为新司机
        ruleResult = {
          id: 'new_driver',
          name: 'New Driver Validation',
          status: 'requires_review',
          result: {
            first_insurance_date: null,
            years_of_history: 0,
            is_new_driver: true,
            reason: 'No insurance history found'
          },
          recommendation: 'Review required: No insurance history found. Treat as new driver.',
          details: 'No first insurance date found in AutoPlus or Quote documents. This indicates no prior insurance history.',
          data_sources: ['AutoPlus', 'Quote']
        };
      } else {
        // 有保险历史数据，计算保险年数
        const today = new Date();
        const insuranceStart = new Date(insuranceDate);
        const diffTime = today.getTime() - insuranceStart.getTime();
        const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

        if (diffYears < 1) {
          // 保险历史不足1年，视为新司机
          ruleResult = {
            id: 'new_driver',
            name: 'New Driver Validation',
            status: 'requires_review',
            result: {
              first_insurance_date: insuranceDate,
              years_of_history: diffYears.toFixed(2),
              is_new_driver: true,
              reason: 'Less than 1 year of insurance history'
            },
            recommendation: 'Review required: Less than 1 year of insurance history. Treat as new driver.',
            details: `First insurance date: ${insuranceDate}. Insurance history: ${diffYears.toFixed(2)} years.`,
            data_sources: dataSource
          };
        } else {
          // 保险历史充足，不是新司机
          ruleResult = {
            id: 'new_driver',
            name: 'New Driver Validation',
            status: 'passed',
            result: {
              first_insurance_date: insuranceDate,
              years_of_history: diffYears.toFixed(2),
              is_new_driver: false,
              reason: 'Sufficient insurance history'
            },
            recommendation: 'No further action required. Insurance history is sufficient.',
            details: `First insurance date: ${insuranceDate}. Insurance history: ${diffYears.toFixed(2)} years.`,
            data_sources: dataSource
          };
        }
      }

      setResult(ruleResult);
      onResultChangeRef.current?.(ruleResult);
    };

    validateRule();
  }, [documents]);

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
              <div><strong>First Insurance Date:</strong> {(result.result as NewDriverResult).first_insurance_date || 'Not found'}</div>
              <div><strong>Years of History:</strong> {(result.result as NewDriverResult).years_of_history}</div>
              <div><strong>New Driver:</strong> {(result.result as NewDriverResult).is_new_driver ? 'Yes' : 'No'}</div>
              {(result.result as NewDriverResult).reason && (
                <div className="md:col-span-2"><strong>Reason:</strong> {(result.result as NewDriverResult).reason}</div>
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