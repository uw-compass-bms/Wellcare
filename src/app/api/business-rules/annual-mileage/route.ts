import { NextRequest, NextResponse } from 'next/server';

// 定义接口类型
interface VehicleData {
  vehicle_id?: string;
  annual_mileage?: string;
  commute_distance?: string;
  // Quote特有字段
  annual_km?: string;
  business_km?: string;
  daily_km?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
}

interface AnnualMileageValidationRequest {
  application?: {
    annual_mileage?: string;
    commute_distance?: string;
    vehicles?: VehicleData[];
  };
  quote?: {
    annual_mileage?: string;
    commute_distance?: string;
    vehicles?: VehicleData[];
  };
}

// 单车辆年里程核对结果
interface SingleVehicleAnnualMileageResult {
  vehicle_id?: string;
  vehicle_info?: string;
  
  // Application数据
  application_annual_mileage?: string;
  application_commute_distance?: string;
  
  // Quote数据
  quote_annual_km?: string;
  quote_commute_distance?: string;
  
  // 验证结果
  status?: 'passed' | 'failed' | 'requires_review';
}

// 多车辆年里程验证汇总结果
interface AnnualMileageResult {
  // 向后兼容的单车辆字段
  reported_distance?: string;
  parsed_distance?: number | string;
  threshold?: number;
  commute_distance?: string;
  parsed_commute?: number | null;
  commute_threshold?: number;
  classification?: string;
  issues?: string[];
  
  // 多车辆支持
  vehicles?: SingleVehicleAnnualMileageResult[];
  total_vehicles?: number;
  vehicles_requiring_review?: number;
  vehicles_passed?: number;
  vehicles_failed?: number;
  overall_classification?: string;
}

interface BusinessRuleResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'requires_review' | 'insufficient_data';
  result?: AnnualMileageResult;
  recommendation: string;
  details: string;
  data_sources?: string[];
}

// 匹配和核对车辆年里程数据
function matchAndValidateVehicles(
  applicationVehicles: VehicleData[],
  quoteVehicles: VehicleData[]
): SingleVehicleAnnualMileageResult[] {
  const results: SingleVehicleAnnualMileageResult[] = [];
  const maxVehicles = Math.max(applicationVehicles.length, quoteVehicles.length);

  for (let i = 0; i < maxVehicles; i++) {
    const appVehicle = applicationVehicles[i];
    const quoteVehicle = quoteVehicles[i];
    
    // 构建车辆信息描述
    const vehicleInfo = [
      appVehicle?.vehicle_year || quoteVehicle?.vehicle_year,
      appVehicle?.vehicle_make || quoteVehicle?.vehicle_make,
      appVehicle?.vehicle_model || quoteVehicle?.vehicle_model
    ].filter(Boolean).join(' ') || 
    appVehicle?.vehicle_id || 
    quoteVehicle?.vehicle_id || 
    `Vehicle ${i + 1}`;

    // 获取原始数据
    const appAnnualMileage = appVehicle?.annual_mileage;
    const appCommuteDistance = appVehicle?.commute_distance;
    const quoteAnnualKm = quoteVehicle?.annual_km;
    const quoteCommuteDistance = quoteVehicle?.daily_km;

    // 解析数字用于验证
    const appAnnualParsed = appAnnualMileage ? parseFloat(appAnnualMileage.replace(/[^\d.]/g, '')) : null;
    const appCommuteParsed = appCommuteDistance ? parseFloat(appCommuteDistance.replace(/[^\d.]/g, '')) : null;
    const quoteAnnualParsed = quoteAnnualKm ? parseFloat(quoteAnnualKm.replace(/[^\d.]/g, '')) : null;
    const quoteCommuteParsed = quoteCommuteDistance ? parseFloat(quoteCommuteDistance.replace(/[^\d.]/g, '')) : null;

    // 简化验证逻辑 - 只检查低里程和低通勤
    let status: 'passed' | 'failed' | 'requires_review' = 'passed';

    // 检查是否有数据
    if (!appAnnualParsed && !quoteAnnualParsed) {
      status = 'failed';
    } else {
      // 低里程检查 - 使用任何可用的数据
      const finalAnnualDistance = appAnnualParsed || quoteAnnualParsed;
      if (finalAnnualDistance && finalAnnualDistance <= 8000) {
        status = 'requires_review';
      }

      // 通勤距离检查 - 使用任何可用的数据
      const finalCommuteDistance = appCommuteParsed || quoteCommuteParsed;
      if (finalCommuteDistance !== null && finalCommuteDistance < 5) {
        status = 'requires_review';
      }
    }

    results.push({
      vehicle_id: appVehicle?.vehicle_id || quoteVehicle?.vehicle_id,
      vehicle_info: vehicleInfo,
      
      // 原始数据
      application_annual_mileage: appAnnualMileage,
      application_commute_distance: appCommuteDistance,
      quote_annual_km: quoteAnnualKm,
      quote_commute_distance: quoteCommuteDistance,
      
      // 验证结果
      status
    });
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const { application, quote }: AnnualMileageValidationRequest = await request.json();

    // 检查多车辆数据
    const applicationVehicles = application?.vehicles || [];
    const quoteVehicles = quote?.vehicles || [];
    const hasMultiVehicleData = applicationVehicles.length > 0 || quoteVehicles.length > 0;

    let ruleResult: BusinessRuleResult;

    if (hasMultiVehicleData) {
      // 多车辆验证逻辑 - 匹配和核对Application与Quote中的车辆
      const allVehicleResults = matchAndValidateVehicles(applicationVehicles, quoteVehicles);

      if (allVehicleResults.length === 0) {
        return NextResponse.json({
          id: 'annual_mileage',
          name: 'Annual Mileage & Commute Validation',
          status: 'insufficient_data',
          recommendation: 'Upload complete Application or Quote with vehicle annual driving distance information',
          details: 'No vehicle data found with annual mileage information',
          data_sources: ['Application', 'Quote']
        });
      }

      // 统计结果
      const totalVehicles = allVehicleResults.length;
      const vehiclesRequiringReview = allVehicleResults.filter(v => v.status === 'requires_review').length;
      const vehiclesPassed = allVehicleResults.filter(v => v.status === 'passed').length;
      const vehiclesFailed = allVehicleResults.filter(v => v.status === 'failed').length;

      // 确定整体状态
      let overallStatus: 'passed' | 'failed' | 'requires_review' = 'passed';
      if (vehiclesFailed > 0) {
        overallStatus = 'failed';
      } else if (vehiclesRequiringReview > 0) {
        overallStatus = 'requires_review';
      }

      // 构建汇总信息  
      const firstVehicle = allVehicleResults[0]; // 向后兼容用的数据

      ruleResult = {
        id: 'annual_mileage',
        name: 'Annual Mileage & Commute Validation',
        status: overallStatus,
        result: {
          // 向后兼容字段 - 使用第一个车辆的数据
          reported_distance: firstVehicle?.application_annual_mileage || firstVehicle?.quote_annual_km,
          parsed_distance: firstVehicle?.application_annual_mileage || firstVehicle?.quote_annual_km,
          threshold: 8000,
          commute_distance: firstVehicle?.application_commute_distance || firstVehicle?.quote_commute_distance,
          parsed_commute: firstVehicle?.application_commute_distance 
            ? parseFloat(firstVehicle.application_commute_distance.replace(/[^\d.]/g, '')) || null
            : firstVehicle?.quote_commute_distance 
            ? parseFloat(firstVehicle.quote_commute_distance.replace(/[^\d.]/g, '')) || null
            : null,
          commute_threshold: 5,
          classification: 'Simplified Review',
          issues: [],
          
          // 多车辆字段
          vehicles: allVehicleResults,
          total_vehicles: totalVehicles,
          vehicles_requiring_review: vehiclesRequiringReview,
          vehicles_passed: vehiclesPassed,
          vehicles_failed: vehiclesFailed,
          overall_classification: overallStatus === 'passed' ? 'All Vehicles Normal' : 
                                  overallStatus === 'failed' ? 'Some Vehicles Failed' : 
                                  'Some Vehicles Require Review'
        },
        recommendation: overallStatus === 'passed' ? 
          'No further action required for any vehicles.' :
          overallStatus === 'failed' ?
          'Review failed vehicles and contact customers for clarification.' :
          'Mark vehicles requiring review for supervisor approval.',
        details: `Validated ${totalVehicles} vehicle(s): ${vehiclesPassed} passed, ${vehiclesRequiringReview} require review, ${vehiclesFailed} failed.`,
        data_sources: [
          ...(applicationVehicles.length > 0 ? ['Application'] : []),
          ...(quoteVehicles.length > 0 ? ['Quote'] : [])
        ]
      };
    } else {
      // 单车辆验证逻辑（向后兼容）
      const annualDistance = application?.annual_mileage || quote?.annual_mileage;
      const commuteDistance = application?.commute_distance || quote?.commute_distance;

      if (!annualDistance) {
        return NextResponse.json({
          id: 'annual_mileage',
          name: 'Annual Mileage & Commute Validation',
          status: 'insufficient_data',
          recommendation: 'Upload complete Application or Quote with annual driving distance information',
          details: 'Missing required data: Annual driving distance not found in Application or Quote',
          data_sources: ['Application', 'Quote']
        });
      }

      // 创建单车辆数据进行验证
      const singleAppVehicle: VehicleData = application ? {
        annual_mileage: application.annual_mileage,
        commute_distance: application.commute_distance
      } : {};

      const singleQuoteVehicle: VehicleData = quote ? {
        annual_km: quote.annual_mileage, // 向后兼容映射
        commute_distance: quote.commute_distance
      } : {};

      const validationResults = matchAndValidateVehicles(
        application ? [singleAppVehicle] : [],
        quote ? [singleQuoteVehicle] : []
      );

      if (validationResults.length === 0) {
        return NextResponse.json({
          id: 'annual_mileage',
          name: 'Annual Mileage & Commute Validation',
          status: 'insufficient_data',
          recommendation: 'Upload complete Application or Quote with annual driving distance information',
          details: 'Missing required data: Annual driving distance not found in Application or Quote',
          data_sources: ['Application', 'Quote']
        });
      }

      const validationResult = validationResults[0];

      ruleResult = {
        id: 'annual_mileage',
        name: 'Annual Mileage & Commute Validation',
        status: validationResult.status === 'requires_review' ? 'requires_review' : 
                validationResult.status === 'failed' ? 'failed' : 'passed',
        result: {
          reported_distance: validationResult.application_annual_mileage || validationResult.quote_annual_km,
          parsed_distance: validationResult.application_annual_mileage || validationResult.quote_annual_km,
          threshold: 8000,
          commute_distance: validationResult.application_commute_distance || validationResult.quote_commute_distance,
          parsed_commute: validationResult.application_commute_distance 
            ? parseFloat(validationResult.application_commute_distance.replace(/[^\d.]/g, '')) || null
            : validationResult.quote_commute_distance 
            ? parseFloat(validationResult.quote_commute_distance.replace(/[^\d.]/g, '')) || null
            : null,
          commute_threshold: 5,
          classification: 'Simplified Review',
          issues: []
        },
        recommendation: validationResult.status === 'passed' ? 
          'No further action required. Annual mileage and commute distance are within normal range.' :
          validationResult.status === 'failed' ?
          'Contact customer to clarify annual driving distance format.' :
          'Mark for supervisor review and verify customer driving patterns.',
        details: 'Single vehicle validation completed.',
        data_sources: [application?.annual_mileage ? 'Application' : 'Quote']
      };
    }

    return NextResponse.json(ruleResult);

  } catch (error) {
    console.error('Annual mileage validation error:', error);
    
    const errorResult: BusinessRuleResult = {
      id: 'annual_mileage',
      name: 'Annual Mileage & Commute Validation',
      status: 'failed',
      recommendation: 'System error occurred during validation',
      details: 'An unexpected error occurred while processing the annual mileage validation. Please try again.',
      data_sources: []
    };
    
    return NextResponse.json(errorResult, { status: 500 });
  }
} 