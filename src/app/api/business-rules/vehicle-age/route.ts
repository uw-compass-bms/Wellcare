import { NextRequest, NextResponse } from 'next/server';

// 请求数据类型定义
interface VehicleAgeValidationRequest {
  quote?: {
    // 向后兼容字段
    vehicle_year?: string;
    // 多车辆数据
    vehicles?: Array<{
      vehicle_id: string;
      vehicle_year: string | null;
      vehicle_make: string | null;
      vehicle_model: string | null;
      coverages?: {
        loss_or_damage?: {
          comprehensive?: {
            covered?: boolean;
            deductible?: string | null;
          } | null;
          collision?: {
            covered?: boolean;
            deductible?: string | null;
          } | null;
          all_perils?: {
            covered?: boolean;
            deductible?: string | null;
          } | null;
        } | null;
      } | null;
    }>;
  };
}

// 单车辆验证结果
interface SingleVehicleAgeResult {
  vehicle_id: string;
  vehicle_info?: string;
  vehicle_year: string | null;
  vehicle_age: number | null;
  coverage_details?: {
    comprehensive: boolean;
    collision: boolean;
    all_perils: boolean;
  };
  status: 'passed' | 'requires_review';
  recommendation: string;
}

// 车辆年龄验证结果
interface VehicleAgeResult {
  // 向后兼容字段
  vehicle_year?: string | null;
  vehicle_age?: number | null;
  coverage_details?: {
    comprehensive: boolean;
    collision: boolean;
    all_perils: boolean;
  };
  
  // 多车辆字段
  vehicles?: SingleVehicleAgeResult[];
  total_vehicles?: number;
  requires_review_vehicles?: number;
}

// 业务规则结果类型
interface BusinessRuleResult {
  id: string;
  name: string;
  status: 'passed' | 'requires_review' | 'insufficient_data';
  result?: VehicleAgeResult;
  recommendation: string;
  details: string;
  data_sources?: string[];
}

// 验证单个车辆
function validateSingleVehicle(
  vehicleId: string,
  vehicleYear: string | null,
  vehicleMake?: string | null,
  vehicleModel?: string | null,
  coverages?: {
    loss_or_damage?: {
      comprehensive?: { covered?: boolean } | null;
      collision?: { covered?: boolean } | null;
      all_perils?: { covered?: boolean } | null;
    } | null;
  } | null
): SingleVehicleAgeResult {
  const vehicleInfo = vehicleMake && vehicleModel 
    ? `${vehicleYear || 'Unknown'} ${vehicleMake} ${vehicleModel}`
    : `Vehicle ${vehicleId}`;

  if (!vehicleYear) {
    return {
      vehicle_id: vehicleId,
      vehicle_info: vehicleInfo,
      vehicle_year: null,
      vehicle_age: null,
      status: 'requires_review',
      recommendation: 'Vehicle year information missing'
    };
  }

  const currentYear = new Date().getFullYear();
  const vehicleYearNum = parseInt(vehicleYear, 10);
  
  if (isNaN(vehicleYearNum)) {
    return {
      vehicle_id: vehicleId,
      vehicle_info: vehicleInfo,
      vehicle_year: vehicleYear,
      vehicle_age: null,
      status: 'requires_review',
      recommendation: `Invalid vehicle year format: ${vehicleYear}`
    };
  }

  const vehicleAge = currentYear - vehicleYearNum;

  // 获取保险覆盖信息
  let hasComprehensiveCoverage = false;
  let hasCollisionCoverage = false;
  let hasAllPerilsCoverage = false;

  if (coverages?.loss_or_damage) {
    const lossOrDamage = coverages.loss_or_damage;
    hasComprehensiveCoverage = lossOrDamage.comprehensive?.covered === true;
    hasCollisionCoverage = lossOrDamage.collision?.covered === true;
    hasAllPerilsCoverage = lossOrDamage.all_perils?.covered === true;
  }

  // 判断是否有足够的保险覆盖（针对新车）
  const hasAdequateCoverage = hasAllPerilsCoverage || (hasComprehensiveCoverage && hasCollisionCoverage);

  // 简化的规则逻辑：车辆年龄 < 3年 且 没有足够的保险覆盖
  const isNewVehicle = vehicleAge < 3;
  const requiresReview = isNewVehicle && !hasAdequateCoverage;

  let status: 'passed' | 'requires_review' = 'passed';
  let recommendation = 'No concerns identified';

  if (requiresReview) {
    status = 'requires_review';
    recommendation = 'New vehicle requires adequate coverage (All Perils OR Comprehensive + Collision)';
  }

  return {
    vehicle_id: vehicleId,
    vehicle_info: vehicleInfo,
    vehicle_year: vehicleYear,
    vehicle_age: vehicleAge,
    coverage_details: {
      comprehensive: hasComprehensiveCoverage,
      collision: hasCollisionCoverage,
      all_perils: hasAllPerilsCoverage
    },
    status,
    recommendation
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Vehicle age validation request received:', JSON.stringify(body, null, 2));
    
    const { quote }: VehicleAgeValidationRequest = body;

    if (!quote) {
      return NextResponse.json({
        id: 'vehicle_age_coverage',
        name: 'Vehicle Age & Coverage Validation',
        status: 'insufficient_data',
        recommendation: 'Upload complete Quote document',
        details: 'No Quote data was provided for validation',
        data_sources: []
      });
    }

    // 准备车辆数据
    const vehiclesData: Array<{
      vehicle_id: string;
      vehicle_year: string | null;
      vehicle_make?: string | null;
      vehicle_model?: string | null;
      coverages?: {
        loss_or_damage?: {
          comprehensive?: { covered?: boolean } | null;
          collision?: { covered?: boolean } | null;
          all_perils?: { covered?: boolean } | null;
        } | null;
      } | null;
    }> = [];

    // 从 Quote 获取车辆数据
    if (quote.vehicles && Array.isArray(quote.vehicles)) {
      vehiclesData.push(...quote.vehicles);
    } else if (quote.vehicle_year) {
      // 向后兼容：单车辆字段
      vehiclesData.push({
        vehicle_id: '1',
        vehicle_year: quote.vehicle_year
      });
    }

    if (vehiclesData.length === 0) {
      return NextResponse.json({
        id: 'vehicle_age_coverage',
        name: 'Vehicle Age & Coverage Validation',
        status: 'insufficient_data',
        recommendation: 'Upload complete Quote with vehicle information',
        details: 'No vehicle data found in Quote document',
        data_sources: ['Quote']
      });
    }

    // 验证每个车辆
    const allVehicleResults = vehiclesData.map(vehicle => 
      validateSingleVehicle(
        vehicle.vehicle_id,
        vehicle.vehicle_year,
        vehicle.vehicle_make,
        vehicle.vehicle_model,
        vehicle.coverages
      )
    );

    console.log('Vehicle validation results:', allVehicleResults);

    // 统计结果
    const totalVehicles = allVehicleResults.length;
    const requiresReviewVehicles = allVehicleResults.filter(v => v.status === 'requires_review').length;

    // 确定整体状态
    const overallStatus: 'passed' | 'requires_review' = requiresReviewVehicles > 0 ? 'requires_review' : 'passed';

    // 生成建议和详情
    let recommendation = 'No further action required for any vehicles.';
    let details = `Validated ${totalVehicles} vehicle(s): ${totalVehicles - requiresReviewVehicles} passed, ${requiresReviewVehicles} require review.`;

    if (requiresReviewVehicles > 0) {
      recommendation = `${requiresReviewVehicles} of ${totalVehicles} vehicles require coverage review.`;
      details = `${requiresReviewVehicles} vehicle(s) are new (< 3 years) without adequate coverage. Review recommended.`;
    }

    const firstVehicle = allVehicleResults[0]; // 向后兼容

    const ruleResult: BusinessRuleResult = {
      id: 'vehicle_age_coverage',
      name: 'Vehicle Age & Coverage Validation',
      status: overallStatus,
      result: {
        // 向后兼容字段
        vehicle_year: firstVehicle?.vehicle_year,
        vehicle_age: firstVehicle?.vehicle_age,
        coverage_details: firstVehicle?.coverage_details,
        
        // 多车辆字段
        vehicles: allVehicleResults,
        total_vehicles: totalVehicles,
        requires_review_vehicles: requiresReviewVehicles
      },
      recommendation,
      details,
      data_sources: ['Quote']
    };

    return NextResponse.json(ruleResult);

  } catch (error) {
    console.error('Vehicle age validation error:', error);
    
    const errorResult: BusinessRuleResult = {
      id: 'vehicle_age_coverage',
      name: 'Vehicle Age & Coverage Validation',
      status: 'insufficient_data',
      recommendation: 'System error occurred during validation',
      details: 'An unexpected error occurred while processing the vehicle age validation. Please try again.',
      data_sources: []
    };
    
    return NextResponse.json(errorResult, { status: 500 });
  }
} 