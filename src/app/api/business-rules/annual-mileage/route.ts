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
  quote?: {
    annual_mileage?: string;
    commute_distance?: string;
    vehicles?: VehicleData[];
  };
}

// 单车辆年里程验证结果
interface SingleVehicleAnnualMileageResult {
  vehicle_id?: string;
  vehicle_info?: string;
  
  // Quote数据
  annual_km?: string;
  commute_distance?: string;
  
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

// 验证车辆年里程数据
function validateVehicles(
  quoteVehicles: VehicleData[]
): SingleVehicleAnnualMileageResult[] {
  const results: SingleVehicleAnnualMileageResult[] = [];

  for (let i = 0; i < quoteVehicles.length; i++) {
    const quoteVehicle = quoteVehicles[i];
    
    // 构建车辆信息描述
    const vehicleInfo = [
      quoteVehicle?.vehicle_year,
      quoteVehicle?.vehicle_make,
      quoteVehicle?.vehicle_model
    ].filter(Boolean).join(' ') || 
    quoteVehicle?.vehicle_id || 
    `Vehicle ${i + 1}`;

    // 获取原始数据
    const quoteAnnualKm = quoteVehicle?.annual_km;
    const quoteCommuteDistance = quoteVehicle?.daily_km;

    // 解析数字用于验证
    const annualParsed = quoteAnnualKm ? parseFloat(quoteAnnualKm.replace(/[^\d.]/g, '')) : null;
    const commuteParsed = quoteCommuteDistance ? parseFloat(quoteCommuteDistance.replace(/[^\d.]/g, '')) : null;

    // 简化验证逻辑 - 只检查低里程和低通勤
    let status: 'passed' | 'failed' | 'requires_review' = 'passed';

    // 检查是否有数据
    if (!annualParsed) {
      status = 'failed';
    } else {
      // 低里程检查
      if (annualParsed <= 8000) {
        status = 'requires_review';
      }

      // 通勤距离检查
      if (commuteParsed !== null && commuteParsed < 5) {
        status = 'requires_review';
      }
    }

    results.push({
      vehicle_id: quoteVehicle?.vehicle_id,
      vehicle_info: vehicleInfo,
      
      // Quote数据
      annual_km: quoteAnnualKm,
      commute_distance: quoteCommuteDistance,
      
      // 验证结果
      status
    });
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Annual mileage validation request received:', JSON.stringify(body, null, 2));
    
    const { quote }: AnnualMileageValidationRequest = body;

    if (!quote) {
      console.log('No quote data provided');
      return NextResponse.json({
        id: 'annual_mileage',
        name: 'Annual Mileage & Commute Validation',
        status: 'insufficient_data',
        recommendation: 'Upload complete Quote document',
        details: 'No Quote data was provided for validation',
        data_sources: []
      });
    }

    // 检查多车辆数据
    const quoteVehicles = quote.vehicles || [];
    const hasMultiVehicleData = quoteVehicles.length > 0;
    
    console.log(`Processing ${hasMultiVehicleData ? 'multi-vehicle' : 'single-vehicle'} data`);
    console.log(`Found ${quoteVehicles.length} vehicles`);

    let ruleResult: BusinessRuleResult;

    if (hasMultiVehicleData) {
      // 多车辆验证逻辑
      const allVehicleResults = validateVehicles(quoteVehicles);
      console.log('Vehicle validation results:', allVehicleResults);

      if (allVehicleResults.length === 0) {
        console.log('No valid vehicle data found');
        return NextResponse.json({
          id: 'annual_mileage',
          name: 'Annual Mileage & Commute Validation',
          status: 'insufficient_data',
          recommendation: 'Upload complete Quote with vehicle annual driving distance information',
          details: 'No vehicle data found with annual mileage information',
          data_sources: ['Quote']
        });
      }

      // 统计结果
      const totalVehicles = allVehicleResults.length;
      const vehiclesRequiringReview = allVehicleResults.filter((v: SingleVehicleAnnualMileageResult) => v.status === 'requires_review').length;
      const vehiclesPassed = allVehicleResults.filter((v: SingleVehicleAnnualMileageResult) => v.status === 'passed').length;
      const vehiclesFailed = allVehicleResults.filter((v: SingleVehicleAnnualMileageResult) => v.status === 'failed').length;

      console.log(`Results: ${vehiclesPassed} passed, ${vehiclesRequiringReview} require review, ${vehiclesFailed} failed`);

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
          reported_distance: firstVehicle?.annual_km,
          parsed_distance: firstVehicle?.annual_km,
          threshold: 8000,
          commute_distance: firstVehicle?.commute_distance,
          parsed_commute: firstVehicle?.commute_distance 
            ? parseFloat(firstVehicle.commute_distance.replace(/[^\d.]/g, '')) || null
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
        data_sources: ['Quote']
      };
    } else {
      // 单车辆验证逻辑（向后兼容）
      const annualDistance = quote.annual_mileage;
      const commuteDistance = quote.commute_distance;
      
      console.log(`Single vehicle mode - annual_mileage: ${annualDistance}, commute_distance: ${commuteDistance}`);

      if (!annualDistance) {
        console.log('No annual mileage data found');
        return NextResponse.json({
          id: 'annual_mileage',
          name: 'Annual Mileage & Commute Validation',
          status: 'insufficient_data',
          recommendation: 'Upload complete Quote with annual driving distance information',
          details: 'Missing required data: Annual driving distance not found in Quote',
          data_sources: ['Quote']
        });
      }

      // 创建单车辆数据进行验证
      const singleQuoteVehicle: VehicleData = {
        annual_km: annualDistance,
        daily_km: commuteDistance || undefined
      };

      const validationResults = validateVehicles([singleQuoteVehicle]);
      console.log('Single vehicle validation result:', validationResults);

      if (validationResults.length === 0) {
        console.log('Failed to validate single vehicle');
        return NextResponse.json({
          id: 'annual_mileage',
          name: 'Annual Mileage & Commute Validation',
          status: 'insufficient_data',
          recommendation: 'Upload complete Quote with annual driving distance information',
          details: 'Missing required data: Annual driving distance not found in Quote',
          data_sources: ['Quote']
        });
      }

      const validationResult = validationResults[0];

      ruleResult = {
        id: 'annual_mileage',
        name: 'Annual Mileage & Commute Validation',
        status: validationResult.status === 'requires_review' ? 'requires_review' : 
                validationResult.status === 'failed' ? 'failed' : 'passed',
        result: {
          reported_distance: validationResult.annual_km,
          parsed_distance: validationResult.annual_km,
          threshold: 8000,
          commute_distance: validationResult.commute_distance,
          parsed_commute: validationResult.commute_distance 
            ? parseFloat(validationResult.commute_distance.replace(/[^\d.]/g, '')) || null
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
        data_sources: ['Quote']
      };
    }

    console.log('Final validation result:', ruleResult);
    return NextResponse.json(ruleResult);

  } catch (error) {
    console.error('Annual mileage validation error:', error);
    
    // 提供更详细的错误信息
    let errorMessage = 'An unexpected error occurred while processing the annual mileage validation';
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    
    const errorResult: BusinessRuleResult = {
      id: 'annual_mileage',
      name: 'Annual Mileage & Commute Validation',
      status: 'failed',
      recommendation: 'System error occurred during validation',
      details: errorMessage,
      data_sources: []
    };
    
    return NextResponse.json(errorResult, { status: 500 });
  }
} 