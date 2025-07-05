import { NextRequest, NextResponse } from 'next/server';

// 定义接口类型
interface AnnualMileageValidationRequest {
  application?: {
    annual_mileage?: string;
    commute_distance?: string;
  };
  quote?: {
    annual_mileage?: string;
    commute_distance?: string;
  };
}

interface AnnualMileageResult {
  reported_distance?: string;
  parsed_distance?: number | string;
  threshold?: number;
  commute_distance?: string;
  parsed_commute?: number | null;
  commute_threshold?: number;
  classification?: string;
  issues?: string[];
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

export async function POST(request: NextRequest) {
  try {
    const { application, quote }: AnnualMileageValidationRequest = await request.json();

    // 业务逻辑验证 - 从原组件提取
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
      
      return NextResponse.json(insufficientDataResult);
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
      
      return NextResponse.json(failedResult);
    }

    const LOW_MILEAGE_THRESHOLD = 8000; // 低里程阈值
    const MIN_COMMUTE_DISTANCE = 5; // 最小通勤距离阈值

    // 判断各种情况
    const isLowMileage = numericAnnualDistance <= LOW_MILEAGE_THRESHOLD;
    const isLowCommute = numericCommuteDistance !== null && numericCommuteDistance < MIN_COMMUTE_DISTANCE;
    const isZeroCommute = numericCommuteDistance === 0;

    let ruleResult: BusinessRuleResult;

    if (isLowMileage || isLowCommute || isZeroCommute) {
      // 需要审核的情况
      const issues = [];
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