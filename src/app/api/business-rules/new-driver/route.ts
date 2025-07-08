import { NextRequest, NextResponse } from 'next/server';

// 请求数据类型定义
interface NewDriverValidationRequest {
  quote?: {
    date_insured?: string;
    date_with_company?: string;
    drivers?: Array<{
      name?: string;
      licence_number?: string;
      date_insured?: string;
      date_with_company?: string;
    }>;
  };
}

// 单驾驶员新司机验证结果
interface SingleDriverNewDriverResult {
  driver_name?: string;
  licence_number?: string;
  
  // Quote数据
  insurance_date?: string;
  
  // 验证结果
  is_new_driver?: boolean;
  years_of_history?: number;
  status?: 'passed' | 'failed' | 'requires_review';
}

// 新司机验证结果
interface NewDriverResult {
  // 向后兼容的单驾驶员字段
  first_insurance_date?: string | null;
  years_of_history?: string | number;
  is_new_driver?: boolean;
  reason?: string;
  
  // 多驾驶员支持
  drivers?: SingleDriverNewDriverResult[];
  total_drivers?: number;
  new_drivers_count?: number;
  experienced_drivers_count?: number;
}

// 业务规则结果类型
interface BusinessRuleResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'requires_review' | 'insufficient_data';
  result?: NewDriverResult;
  recommendation: string;
  details: string;
  data_sources?: string[];
}

// 验证驾驶员新司机状态
function validateDrivers(
  quoteDrivers: Array<{name?: string; licence_number?: string; date_insured?: string; date_with_company?: string}>
): SingleDriverNewDriverResult[] {
  const results: SingleDriverNewDriverResult[] = [];

  for (let i = 0; i < quoteDrivers.length; i++) {
    const quoteDriver = quoteDrivers[i];
    
    // 构建驾驶员信息
    const driverName = quoteDriver?.name || `Driver ${i + 1}`;
    const licenceNumber = quoteDriver?.licence_number;

    // 优先使用date_insured，没有则使用date_with_company
    const insuranceDate = quoteDriver?.date_insured || quoteDriver?.date_with_company;

    // 验证新司机状态
    let isNewDriver = false;
    let yearsOfHistory = 0;
    let status: 'passed' | 'failed' | 'requires_review' = 'passed';

    if (!insuranceDate) {
      // 没有保险历史数据，视为新司机
      isNewDriver = true;
      status = 'requires_review';
    } else {
      // 计算保险年数
      const today = new Date();
      const insuranceStart = new Date(insuranceDate);
      const diffTime = today.getTime() - insuranceStart.getTime();
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
      
      yearsOfHistory = Math.max(0, diffYears);

      if (diffYears < 1) {
        // 保险历史不足1年，视为新司机
        isNewDriver = true;
        status = 'requires_review';
      } else {
        // 保险历史充足，不是新司机
        isNewDriver = false;
        status = 'passed';
      }
    }

    results.push({
      driver_name: driverName,
      licence_number: licenceNumber,
      insurance_date: insuranceDate,
      
      // 验证结果
      is_new_driver: isNewDriver,
      years_of_history: yearsOfHistory,
      status
    });
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('New driver validation request received:', JSON.stringify(body, null, 2));
    
    const { quote }: NewDriverValidationRequest = body;

    if (!quote) {
      console.log('No quote data provided');
      return NextResponse.json({
        id: 'new_driver',
        name: 'New Driver Validation',
        status: 'insufficient_data',
        recommendation: 'Upload complete Quote document',
        details: 'No Quote data was provided for validation',
        data_sources: []
      });
    }

    // 检查多驾驶员数据
    const quoteDrivers = quote.drivers || [];
    const hasMultiDriverData = quoteDrivers.length > 0;
    
    console.log(`Processing ${hasMultiDriverData ? 'multi-driver' : 'single-driver'} data`);
    console.log(`Found ${quoteDrivers.length} drivers`);

    let ruleResult: BusinessRuleResult;

    if (hasMultiDriverData) {
      // 多驾驶员验证逻辑
      const allDriverResults = validateDrivers(quoteDrivers);
      console.log('Driver validation results:', allDriverResults);

      if (allDriverResults.length === 0) {
        console.log('No valid driver data found');
        return NextResponse.json({
          id: 'new_driver',
          name: 'New Driver Validation',
          status: 'insufficient_data',
          recommendation: 'Upload complete Quote with driver information',
          details: 'No driver data found for new driver validation',
          data_sources: ['Quote']
        });
      }

      // 统计结果
      const totalDrivers = allDriverResults.length;
      const newDriversCount = allDriverResults.filter((d: SingleDriverNewDriverResult) => d.is_new_driver).length;
      const experiencedDriversCount = totalDrivers - newDriversCount;

      console.log(`Results: ${experiencedDriversCount} experienced, ${newDriversCount} new drivers`);

      // 确定整体状态
      let overallStatus: 'passed' | 'failed' | 'requires_review' = 'passed';
      if (newDriversCount > 0) {
        overallStatus = 'requires_review';
      }

      const firstDriver = allDriverResults[0]; // 向后兼容用的数据

      ruleResult = {
        id: 'new_driver',
        name: 'New Driver Validation',
        status: overallStatus,
        result: {
          // 向后兼容字段
          first_insurance_date: firstDriver?.insurance_date,
          years_of_history: firstDriver?.years_of_history || 0,
          is_new_driver: firstDriver?.is_new_driver || false,
          reason: newDriversCount > 0 ? 'New drivers detected' : 'All drivers experienced',
          
          // 多驾驶员字段
          drivers: allDriverResults,
          total_drivers: totalDrivers,
          new_drivers_count: newDriversCount,
          experienced_drivers_count: experiencedDriversCount
        },
        recommendation: overallStatus === 'passed' ? 
          'No further action required. All drivers have sufficient insurance history.' :
          'Review required: New drivers detected. Additional documentation may be needed.',
        details: `Validated ${totalDrivers} driver(s): ${newDriversCount} new driver(s), ${experiencedDriversCount} experienced driver(s).`,
        data_sources: ['Quote']
      };
    } else {
      // 单驾驶员验证逻辑（向后兼容）
      const insuranceDate = quote.date_insured || quote.date_with_company;
      
      console.log(`Single driver mode - date_insured: ${quote.date_insured}, date_with_company: ${quote.date_with_company}`);

      if (!insuranceDate) {
        console.log('No insurance date found, treating as new driver');
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
          recommendation: 'Review required: No insurance history found. Driver appears to be new.',
          details: 'No insurance start date found in Quote data. Driver is classified as new.',
          data_sources: ['Quote']
        };
      } else {
        // 创建单驾驶员数据进行验证
        const singleQuoteDriver = {
          name: 'Primary Driver',
          licence_number: undefined,
          date_insured: quote.date_insured,
          date_with_company: quote.date_with_company
        };

        const validationResults = validateDrivers([singleQuoteDriver]);
        console.log('Single driver validation result:', validationResults);

        if (validationResults.length === 0) {
          console.log('Failed to validate single driver');
          return NextResponse.json({
            id: 'new_driver',
            name: 'New Driver Validation',
            status: 'insufficient_data',
            recommendation: 'Upload complete Quote with driver information',
            details: 'Unable to validate driver insurance history',
            data_sources: ['Quote']
          });
        }

        const validationResult = validationResults[0];

        ruleResult = {
          id: 'new_driver',
          name: 'New Driver Validation',
          status: validationResult.status === 'requires_review' ? 'requires_review' : 'passed',
          result: {
            first_insurance_date: validationResult.insurance_date,
            years_of_history: validationResult.years_of_history || 0,
            is_new_driver: validationResult.is_new_driver || false,
            reason: validationResult.is_new_driver ? 'Insufficient insurance history' : 'Sufficient insurance history'
          },
          recommendation: validationResult.status === 'passed' ? 
            'No further action required. Driver has sufficient insurance history.' :
            'Review required: Driver has limited insurance history.',
          details: `Driver has ${validationResult.years_of_history?.toFixed(1)} years of insurance history.`,
          data_sources: ['Quote']
        };
      }
    }

    console.log('Final validation result:', ruleResult);
    return NextResponse.json(ruleResult);

  } catch (error) {
    console.error('New driver validation error:', error);
    
    // 提供更详细的错误信息
    let errorMessage = 'An unexpected error occurred while processing the new driver validation';
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }
    
    const errorResult: BusinessRuleResult = {
      id: 'new_driver',
      name: 'New Driver Validation',
      status: 'failed',
      recommendation: 'System error occurred during validation',
      details: errorMessage,
      data_sources: []
    };
    
    return NextResponse.json(errorResult, { status: 500 });
  }
} 