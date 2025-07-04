'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG } from './types';
import { ApplicationData, QuoteData } from '../../../types';

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
      const quote = documents.quote as QuoteData;

      // 检查必要数据是否存在 - 优先从Application获取，然后从Quote获取
      const annualDistance = application?.annual_mileage || quote?.annual_mileage;
      const commuteDistance = application?.commute_distance || quote?.commute_distance;

      if (!annualDistance) {
        const insufficientDataResult: BusinessRuleResult = {
          id: 'annual_mileage',
          name: 'Annual Mileage & Commute Validation',
          status: 'insufficient_data',
          recommendation: 'Upload complete Application or Quote with annual driving distance information',
          details: 'Missing required data: Annual driving distance not found in Application or Quote',
          data_sources: ['Application', 'Quote']
        };
        setResult(insufficientDataResult);
        onResultChangeRef.current?.(insufficientDataResult);
        return;
      }

      // 解析年行驶距离数据
      const numericAnnualDistance = parseFloat(annualDistance.replace(/[^\d.]/g, ''));
      const numericCommuteDistance = commuteDistance ? parseFloat(commuteDistance.replace(/[^\d.]/g, '')) : null;

      if (isNaN(numericAnnualDistance)) {
        const failedResult: BusinessRuleResult = {
          id: 'annual_mileage',
          name: 'Annual Mileage & Commute Validation',
          status: 'failed',
          result: {
            reported_distance: annualDistance,
            parsed_distance: 'Invalid'
          },
          recommendation: 'Contact customer to clarify annual driving distance format',
          details: `Unable to parse annual driving distance: "${annualDistance}". Please verify the format.`,
          data_sources: application?.annual_mileage ? ['Application'] : ['Quote']
        };
        setResult(failedResult);
        onResultChangeRef.current?.(failedResult);
        return;
      }

      const LOW_MILEAGE_THRESHOLD = 8000; // 低里程阈值
      const MIN_COMMUTE_DISTANCE = 5; // 最小通勤距离阈值
      let ruleResult: BusinessRuleResult;

      // 判断各种情况
      const isLowMileage = numericAnnualDistance <= LOW_MILEAGE_THRESHOLD;
      const isLowCommute = numericCommuteDistance !== null && numericCommuteDistance < MIN_COMMUTE_DISTANCE;
      const isZeroCommute = numericCommuteDistance === 0;

      if (isLowMileage || isLowCommute || isZeroCommute) {
        // 需要审核的情况
        let issues = [];
        if (isLowMileage) {
          issues.push(`Annual mileage (${numericAnnualDistance.toLocaleString()} km) is at or below ${LOW_MILEAGE_THRESHOLD.toLocaleString()} km threshold`);
        }
        if (isZeroCommute) {
          issues.push(`Zero commute distance reported`);
        } else if (isLowCommute) {
          issues.push(`Low commute distance (${numericCommuteDistance} km) is below ${MIN_COMMUTE_DISTANCE} km threshold`);
        }

        ruleResult = {
          id: 'annual_mileage',
          name: 'Annual Mileage & Commute Validation',
          status: 'requires_review',
          result: {
            reported_distance: annualDistance,
            parsed_distance: numericAnnualDistance,
            threshold: LOW_MILEAGE_THRESHOLD,
            commute_distance: commuteDistance,
            parsed_commute: numericCommuteDistance,
            commute_threshold: MIN_COMMUTE_DISTANCE,
            classification: 'Requires Review - ' + (isLowMileage ? 'Low Mileage' : '') + 
                           (isLowMileage && (isLowCommute || isZeroCommute) ? ' & ' : '') + 
                           (isZeroCommute ? 'Zero Commute' : isLowCommute ? 'Low Commute' : ''),
            issues: issues
          },
          recommendation: 'Mark for supervisor review and verify customer driving patterns',
          details: `Issues found: ${issues.join('; ')}. This requires special attention and supervisor approval.`,
          data_sources: [
            ...(application?.annual_mileage ? ['Application'] : []),
            ...(quote?.annual_mileage ? ['Quote'] : [])
          ]
        };
      } else {
        // 审核通过
        ruleResult = {
          id: 'annual_mileage',
          name: 'Annual Mileage & Commute Validation',
          status: 'passed',
          result: {
            reported_distance: annualDistance,
            parsed_distance: numericAnnualDistance,
            threshold: LOW_MILEAGE_THRESHOLD,
            commute_distance: commuteDistance,
            parsed_commute: numericCommuteDistance,
            commute_threshold: MIN_COMMUTE_DISTANCE,
            classification: 'Normal Usage Pattern'
          },
          recommendation: 'No further action required. Annual mileage and commute distance are within normal range.',
          details: `Annual driving distance (${numericAnnualDistance.toLocaleString()} km) exceeds ${LOW_MILEAGE_THRESHOLD.toLocaleString()} km threshold` +
                   (numericCommuteDistance !== null ? ` and commute distance (${numericCommuteDistance} km) is acceptable` : '') + 
                   '. No additional review required.',
          data_sources: [
            ...(application?.annual_mileage ? ['Application'] : []),
            ...(quote?.annual_mileage ? ['Quote'] : [])
          ]
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
            <strong>Analysis:</strong>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div><strong>Annual:</strong> {typeof result.result.parsed_distance === 'number' 
                ? `${result.result.parsed_distance.toLocaleString()} km` 
                : result.result.parsed_distance}</div>
              {result.result.parsed_commute !== null && (
                <div><strong>Commute:</strong> {result.result.parsed_commute} km</div>
              )}
            </div>
            
            {result.status === 'requires_review' && (
              <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
                <strong>Required Actions:</strong>
                <ul className="mt-1 ml-4 list-disc space-y-1">
                  {result.result.issues?.map((issue: string, index: number) => (
                    <li key={index} className="text-red-700 font-medium">{issue}</li>
                  ))}
                </ul>
                <ul className="mt-2 ml-4 list-disc space-y-1">
                  <li>Mark this application for supervisor review</li>
                  <li>Verify customer driving patterns and usage</li>
                  <li>Update system notes with review status</li>
                  <li>Consider requesting additional documentation if needed</li>
                  <li>Confirm annual mileage and commute distance accuracy</li>
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