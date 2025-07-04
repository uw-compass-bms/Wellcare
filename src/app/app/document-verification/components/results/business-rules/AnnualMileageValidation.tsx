'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG } from './types';
import { ApplicationData } from '../../../types';

export default function AnnualMileageValidation({ documents, onResultChange }: BusinessRuleProps) {
  const [result, setResult] = useState<BusinessRuleResult | null>(null);
  const onResultChangeRef = useRef(onResultChange);
  
  // 更新ref以避免stale closure
  useEffect(() => {
    onResultChangeRef.current = onResultChange;
  }, [onResultChange]);

  useEffect(() => {
    const validateRule = () => {
      const application = documents.application as ApplicationData;

      // 检查必要数据是否存在
      if (!application || !application.estimated_annual_driving_distance) {
        const insufficientDataResult: BusinessRuleResult = {
          id: 'annual_mileage',
          name: 'Annual Mileage Validation',
          status: 'insufficient_data',
          recommendation: 'Upload complete Application form with annual driving distance information',
          details: 'Missing required Application data: Estimated annual driving distance not found',
          data_sources: ['Application']
        };
        setResult(insufficientDataResult);
        onResultChangeRef.current?.(insufficientDataResult);
        return;
      }

      // 获取年行驶距离数据
      const annualDistance = application.estimated_annual_driving_distance;
      const numericDistance = parseFloat(annualDistance.replace(/[^\d.]/g, '')); // 提取数字部分

      if (isNaN(numericDistance)) {
        const failedResult: BusinessRuleResult = {
          id: 'annual_mileage',
          name: 'Annual Mileage Validation',
          status: 'failed',
          result: {
            reported_distance: annualDistance,
            parsed_distance: 'Invalid'
          },
          recommendation: 'Contact customer to clarify annual driving distance format',
          details: `Unable to parse annual driving distance: "${annualDistance}". Please verify the format.`,
          data_sources: ['Application']
        };
        setResult(failedResult);
        onResultChangeRef.current?.(failedResult);
        return;
      }

      const LOW_MILEAGE_THRESHOLD = 8000; // 低里程阈值
      let ruleResult: BusinessRuleResult;

      if (numericDistance > LOW_MILEAGE_THRESHOLD) {
        // 超过8000公里，审核通过
        ruleResult = {
          id: 'annual_mileage',
          name: 'Annual Mileage Validation',
          status: 'passed',
          result: {
            reported_distance: annualDistance,
            parsed_distance: numericDistance,
            threshold: LOW_MILEAGE_THRESHOLD,
            classification: 'Normal Mileage'
          },
          recommendation: 'No further action required. Annual mileage is within normal range.',
          details: `Annual driving distance (${numericDistance.toLocaleString()} km) exceeds ${LOW_MILEAGE_THRESHOLD.toLocaleString()} km threshold. No additional review required.`,
          data_sources: ['Application']
        };
      } else {
        // 8000公里或以下，需要标记和审核
        ruleResult = {
          id: 'annual_mileage',
          name: 'Annual Mileage Validation',
          status: 'requires_review',
          result: {
            reported_distance: annualDistance,
            parsed_distance: numericDistance,
            threshold: LOW_MILEAGE_THRESHOLD,
            classification: 'Low Mileage - Requires Review'
          },
          recommendation: 'Mark low mileage situation and submit for supervisor review',
          details: `Annual driving distance (${numericDistance.toLocaleString()} km) is at or below ${LOW_MILEAGE_THRESHOLD.toLocaleString()} km threshold. This requires special attention and supervisor approval.`,
          data_sources: ['Application']
        };
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
            <strong>Mileage Analysis:</strong>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div><strong>Reported Distance:</strong> {result.result.reported_distance}</div>
              <div><strong>Parsed Distance:</strong> {typeof result.result.parsed_distance === 'number' 
                ? `${result.result.parsed_distance.toLocaleString()} km` 
                : result.result.parsed_distance}</div>
              {result.result.threshold && (
                <div><strong>Threshold:</strong> {result.result.threshold.toLocaleString()} km</div>
              )}
              {result.result.classification && (
                <div><strong>Classification:</strong> {result.result.classification}</div>
              )}
            </div>
            
            {result.status === 'requires_review' && (
              <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
                <strong>Required Actions:</strong>
                <ul className="mt-1 ml-4 list-disc space-y-1">
                  <li>Mark this application for low mileage review</li>
                  <li>Submit to supervisor for approval</li>
                  <li>Update system notes with review status</li>
                  <li>Consider requesting additional documentation if needed</li>
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