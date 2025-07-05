import { NextRequest, NextResponse } from 'next/server';

// 请求数据类型定义
interface VehicleAgeValidationRequest {
  application?: {
    vehicle_year?: string;
    insurance_coverages?: {
      liability_amount?: string;
      loss_or_damage?: {
        comprehensive?: { covered?: boolean };
        collision?: { covered?: boolean };
        all_perils?: { covered?: boolean };
      };
    };
  };
  quote?: {
    vehicle_year?: string;
  };
}

// 业务规则结果类型
interface BusinessRuleResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'requires_review' | 'insufficient_data';
  result?: Record<string, unknown>;
  recommendation: string;
  details: string;
  data_sources?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { application, quote }: VehicleAgeValidationRequest = await request.json();

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
      return NextResponse.json(insufficientDataResult);
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
      return NextResponse.json(failedResult);
    }

    const vehicleAge = currentYear - vehicleYearNum;

    // 获取保险覆盖信息 - 只从Application获取，因为Quote通常没有详细的保险覆盖信息
    let hasComprehensiveCoverage = false;
    let hasCollisionCoverage = false;
    let hasAllPerilsCoverage = false;
    let liabilityAmount: string | null = null;

    if (application?.insurance_coverages) {
      if (!dataSources.includes('Application')) {
        dataSources.push('Application');
      }
      
      // 检查责任险
      liabilityAmount = application.insurance_coverages.liability_amount || null;
      
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

    return NextResponse.json(ruleResult);

  } catch (error) {
    console.error('Vehicle age validation error:', error);
    
    const errorResult: BusinessRuleResult = {
      id: 'vehicle_age_coverage',
      name: 'Vehicle Age & Coverage Validation',
      status: 'failed',
      recommendation: 'System error occurred during validation',
      details: 'An unexpected error occurred while processing the vehicle age validation. Please try again.',
      data_sources: []
    };
    
    return NextResponse.json(errorResult, { status: 500 });
  }
} 