import { NextRequest, NextResponse } from 'next/server';

// 请求数据类型定义
interface NewDriverValidationRequest {
  autoplus?: {
    first_insurance_date?: string;
  };
  quote?: {
    date_insured?: string;
    date_with_company?: string;
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
    const { autoplus, quote }: NewDriverValidationRequest = await request.json();

    // 业务逻辑：优先从AutoPlus获取首次保险日期，否则从Quote获取相关保险日期
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

    return NextResponse.json(ruleResult);

  } catch (error) {
    console.error('New driver validation error:', error);
    
    const errorResult: BusinessRuleResult = {
      id: 'new_driver',
      name: 'New Driver Validation',
      status: 'failed',
      recommendation: 'System error occurred during validation',
      details: 'An unexpected error occurred while processing the new driver validation. Please try again.',
      data_sources: []
    };
    
    return NextResponse.json(errorResult, { status: 500 });
  }
} 