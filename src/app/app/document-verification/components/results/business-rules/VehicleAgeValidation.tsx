'use client';

import React, { useEffect, useState, useRef } from 'react';
import { BusinessRuleProps, BusinessRuleResult, RULE_STATUS_CONFIG, VehicleAgeResult } from './types';
import { ApplicationData, QuoteData } from '../../../types';

export default function VehicleAgeValidation({ documents, onResultChange }: BusinessRuleProps) {
  const [result, setResult] = useState<BusinessRuleResult | null>(null);
  const onResultChangeRef = useRef(onResultChange);
  
  // 更新ref以避免stale closure
  useEffect(() => {
    onResultChangeRef.current = onResultChange;
  }, [onResultChange]);

  useEffect(() => {
    const validateRule = () => {
      // 安全地获取文档数据
      const application = documents.application as unknown as ApplicationData | undefined;
      const quote = documents.quote as unknown as QuoteData | undefined;

      // 获取车辆年份 - 优先从Quote获取，再从Application获取
      let vehicleYear: string | null = null;
      const dataSources: string[] = [];

      if (quote?.vehicle_year) {
        vehicleYear = quote.vehicle_year;
        dataSources.push('Quote');
      } else if (application?.vehicle_year) {
        vehicleYear = application.vehicle_year;
        dataSources.push('Application');
      }

      // 检查是否有车辆年份数据
      if (!vehicleYear) {
        const insufficientDataResult: BusinessRuleResult = {
          id: 'vehicle_age_coverage',
          name: 'Vehicle Age & Coverage Validation',
          status: 'insufficient_data',
          recommendation: 'Upload complete Quote or Application with vehicle year information',
          details: 'Missing required data: Vehicle year not found in Quote or Application documents',
          data_sources: ['Quote', 'Application']
        };
        setResult(insufficientDataResult);
        onResultChangeRef.current?.(insufficientDataResult);
        return;
      }

      // 解析车辆年份
      const currentYear = new Date().getFullYear();
      const vehicleYearNum = parseInt(vehicleYear, 10);
      
      if (isNaN(vehicleYearNum)) {
        const failedResult: BusinessRuleResult = {
          id: 'vehicle_age_coverage',
          name: 'Vehicle Age & Coverage Validation',
          status: 'failed',
          result: {
            vehicle_year: vehicleYear,
            vehicle_age: null,
            current_year: currentYear
          },
          recommendation: 'Contact customer to clarify vehicle year format',
          details: `Unable to parse vehicle year: "${vehicleYear}". Please verify the format.`,
          data_sources: dataSources
        };
        setResult(failedResult);
        onResultChangeRef.current?.(failedResult);
        return;
      }

      const vehicleAge = currentYear - vehicleYearNum;

      // 获取保险覆盖信息 - 只从Application获取，因为Quote通常没有详细的保险覆盖信息
      let hasComprehensiveCoverage = false;
      let hasCollisionCoverage = false;
      let hasAllPerilsCoverage = false;
      let liabilityAmount: string | null = null;

      if (application?.insurance_coverages) {
        dataSources.push('Application');
        
        // 检查责任险
        liabilityAmount = application.insurance_coverages.liability_amount;
        
        // 检查损失或损害保险
        const lossOrDamage = application.insurance_coverages.loss_or_damage;
        if (lossOrDamage) {
          hasComprehensiveCoverage = lossOrDamage.comprehensive?.covered === true;
          hasCollisionCoverage = lossOrDamage.collision?.covered === true;
          hasAllPerilsCoverage = lossOrDamage.all_perils?.covered === true;
        }
      }

      // 判断是否有足够的保险覆盖（针对新车）
      const hasAdequateCoverage = hasAllPerilsCoverage || (hasComprehensiveCoverage && hasCollisionCoverage);

      // 应用规则逻辑：车辆年龄 < 3年 且 没有足够的保险覆盖
      const isNewVehicle = vehicleAge < 3;
      const requiresCaution = isNewVehicle && !hasAdequateCoverage;

      let riskLevel: 'high' | 'medium' | 'low' = 'low';
      if (requiresCaution) {
        riskLevel = 'high';
      } else if (isNewVehicle && hasAdequateCoverage) {
        riskLevel = 'medium'; // 新车且有足够保险
      }

      const ruleResult: BusinessRuleResult = {
        id: 'vehicle_age_coverage',
        name: 'Vehicle Age & Coverage Validation',
        status: requiresCaution ? 'requires_review' : 'passed',
        result: {
          vehicle_year: vehicleYear,
          vehicle_age: vehicleAge,
          current_year: currentYear,
          coverage_details: {
            liability: liabilityAmount,
            comprehensive: hasComprehensiveCoverage,
            collision: hasCollisionCoverage,
            all_perils: hasAllPerilsCoverage
          },
          risk_level: riskLevel
        },
        recommendation: requiresCaution 
          ? 'Caution required: Vehicle is less than 3 years old without adequate coverage. New vehicles must have either All Perils OR both Comprehensive and Collision coverage.'
          : 'No concerns identified. Vehicle age and coverage combination is acceptable.',
        details: requiresCaution
          ? `Vehicle (${vehicleYear}) is ${vehicleAge} year(s) old without adequate coverage. Required: All Perils OR (Comprehensive + Collision). Current coverage: ${hasAllPerilsCoverage ? 'All Perils' : ''} ${hasComprehensiveCoverage ? 'Comprehensive' : ''} ${hasCollisionCoverage ? 'Collision' : ''} ${liabilityAmount ? `Liability(${liabilityAmount})` : ''}.`
          : `Vehicle (${vehicleYear}) is ${vehicleAge} year(s) old. ${hasAdequateCoverage ? 'Vehicle has adequate coverage for its age.' : 'Coverage is acceptable for this vehicle age.'}`,
        data_sources: dataSources
      };

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
            <strong>Vehicle Analysis:</strong>
            <div className="mt-2 space-y-3">
              {/* 车辆基本信息 */}
              <div className="border-l-4 border-blue-500 pl-3">
                <h5 className="font-medium text-sm text-blue-900">Vehicle Information</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs mt-1">
                  <div><strong>Year:</strong> {(result.result as VehicleAgeResult).vehicle_year}</div>
                  <div><strong>Age:</strong> {(result.result as VehicleAgeResult).vehicle_age} year(s)</div>
                  <div><strong>Risk Level:</strong> 
                    <span className={`ml-1 px-1 py-0.5 rounded text-xs ${
                      (result.result as VehicleAgeResult).risk_level === 'high' ? 'bg-red-100 text-red-800' :
                      (result.result as VehicleAgeResult).risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {(result.result as VehicleAgeResult).risk_level?.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* 保险覆盖详情 */}
              <div className="border-l-4 border-green-500 pl-3">
                <h5 className="font-medium text-sm text-green-900">Coverage Details</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
                  <div><strong>Liability:</strong> {(result.result as VehicleAgeResult).coverage_details?.liability || 'N/A'}</div>
                  <div><strong>Comprehensive:</strong> {(result.result as VehicleAgeResult).coverage_details?.comprehensive ? 'Yes' : 'No'}</div>
                  <div><strong>Collision:</strong> {(result.result as VehicleAgeResult).coverage_details?.collision ? 'Yes' : 'No'}</div>
                  <div><strong>All Perils:</strong> {(result.result as VehicleAgeResult).coverage_details?.all_perils ? 'Yes' : 'No'}</div>
                </div>
              </div>

              {/* 风险提醒 */}
              {(result.result as VehicleAgeResult).risk_level === 'high' && (
                <div className="border-l-4 border-red-500 pl-3">
                  <h5 className="font-medium text-sm text-red-900">Risk Assessment</h5>
                  <div className="text-xs mt-1 space-y-1">
                    <div className="text-red-800">⚠️ High Risk: New vehicle without adequate coverage</div>
                    <div className="text-red-700">• Required: All Perils OR (Comprehensive + Collision)</div>
                    <div className="text-red-700">• Review customer&apos;s needs and recommend appropriate coverage</div>
                    <div className="text-red-700">• Document decision rationale in customer file</div>
                    <div className="text-red-700">• Consider policy terms and customer risk tolerance</div>
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