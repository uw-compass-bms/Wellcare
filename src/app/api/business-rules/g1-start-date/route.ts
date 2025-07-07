import { NextRequest, NextResponse } from 'next/server';

// 请求数据类型定义 - 简化版
interface G1StartDateValidationRequest {
  mvr?: {
    date_of_birth?: string;
    expiry_date?: string;
    issue_date?: string;
  };
  quote?: {
    date_g1?: string;
  };
}

// 业务规则结果类型
interface BusinessRuleResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'requires_review' | 'insufficient_data';
  result?: {
    // MVR计算结果
    mvr_calculated_g1_date: string | null;
    calculation_method: string;
    birth_date: string | null;
    expiry_date: string | null;
    issue_date: string | null;
    birth_month_day: string | null;
    expiry_month_day: string | null;
    // Quote对比结果
    quote_g1_date: string | null;
    dates_match: boolean;
    date_difference_days: number | null;
  };
  recommendation: string;
  details: string;
  data_sources: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { mvr, quote }: G1StartDateValidationRequest = await request.json();

    // 工具函数
    const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) return 'N/A';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-CA'); // YYYY-MM-DD格式
      } catch {
        return dateString || 'N/A';
      }
    };

    const getMonthDay = (dateString: string | null | undefined): string | null => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}-${day}`;
      } catch {
        return null;
      }
    };

    const subtractYears = (dateString: string | null | undefined, years: number): string | null => {
      if (!dateString) return null;
      try {
        const date = new Date(dateString);
        date.setFullYear(date.getFullYear() - years);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD格式
      } catch {
        return null;
      }
    };

    const getDaysDifference = (date1: string | null | undefined, date2: string | null | undefined): number | null => {
      if (!date1 || !date2) return null;
      try {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      } catch {
        return null;
      }
    };

    // 检查是否有足够的数据
    if (!mvr?.date_of_birth || !mvr?.expiry_date) {
      return NextResponse.json({
        id: 'g1_start_date',
        name: 'G1 Start Date Validation',
        status: 'insufficient_data',
        recommendation: 'Upload MVR document with birth date and expiry date',
        details: 'Missing required MVR data: birth date and expiry date are required for G1 calculation',
        data_sources: []
      } as BusinessRuleResult);
    }

    // 步骤1：计算G1日期
    let calculatedG1Date: string | null = null;
    let calculationMethod = '';
    
    const birthMonthDay = getMonthDay(mvr.date_of_birth);
    const expiryMonthDay = getMonthDay(mvr.expiry_date);
    
    if (birthMonthDay && expiryMonthDay) {
      if (birthMonthDay === expiryMonthDay) {
        // 月日一致：使用Issue Date
        if (mvr.issue_date) {
          calculatedG1Date = mvr.issue_date;
          calculationMethod = 'Used Issue Date (Birth date and Expiry date have matching month/day)';
        } else {
          calculationMethod = 'Issue Date not available (Birth date and Expiry date have matching month/day)';
        }
      } else {
        // 月日不一致：Expiry Date减5年
        calculatedG1Date = subtractYears(mvr.expiry_date, 5);
        calculationMethod = 'Expiry Date minus 5 years (Birth date and Expiry date have different month/day)';
      }
    }

    // 步骤2：与Quote中的G1日期对比
    const quoteG1Date = quote?.date_g1 || null;
    let datesMatch = false;
    let dateDifferenceDays: number | null = null;

    if (calculatedG1Date && quoteG1Date) {
      dateDifferenceDays = getDaysDifference(calculatedG1Date, quoteG1Date);
      datesMatch = dateDifferenceDays !== null && dateDifferenceDays <= 30; // 容忍30天差异
    }

    // 步骤3：确定验证结果
    let status: 'passed' | 'failed' | 'requires_review' | 'insufficient_data';
    let recommendation: string;
    let details: string;

    if (!calculatedG1Date) {
      status = 'failed';
      recommendation = 'Unable to calculate G1 date from MVR data';
      details = 'G1 date calculation failed. Please verify MVR data completeness.';
    } else if (!quoteG1Date) {
      status = 'requires_review';
      recommendation = 'G1 date calculated from MVR, but no Quote G1 date available for comparison';
      details = `Calculated G1 date: ${formatDate(calculatedG1Date)}. Quote G1 date not provided.`;
    } else if (datesMatch) {
      status = 'passed';
      recommendation = 'G1 dates match between MVR and Quote';
      details = `MVR calculated G1 date (${formatDate(calculatedG1Date)}) matches Quote G1 date (${formatDate(quoteG1Date)}) within acceptable range.`;
    } else {
      status = 'failed';
      recommendation = 'G1 dates do not match between MVR and Quote';
      details = `MVR calculated G1 date (${formatDate(calculatedG1Date)}) differs from Quote G1 date (${formatDate(quoteG1Date)}) by ${dateDifferenceDays} days.`;
    }

    // 构建数据源列表
    const dataSources = [];
    if (mvr) dataSources.push('MVR');
    if (quote) dataSources.push('Quote');

    const result: BusinessRuleResult = {
      id: 'g1_start_date',
      name: 'G1 Start Date Validation',
      status,
      result: {
        mvr_calculated_g1_date: calculatedG1Date,
        calculation_method: calculationMethod,
        birth_date: mvr.date_of_birth,
        expiry_date: mvr.expiry_date,
        issue_date: mvr.issue_date || null,
        birth_month_day: birthMonthDay,
        expiry_month_day: expiryMonthDay,
        quote_g1_date: quoteG1Date,
        dates_match: datesMatch,
        date_difference_days: dateDifferenceDays
      },
      recommendation,
      details,
      data_sources: dataSources
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('G1 start date validation error:', error);
    
    const errorResult: BusinessRuleResult = {
      id: 'g1_start_date',
      name: 'G1 Start Date Validation',
      status: 'failed',
      recommendation: 'System error occurred during validation',
      details: 'An unexpected error occurred while processing the G1 start date validation. Please try again.',
      data_sources: []
    };
    
    return NextResponse.json(errorResult, { status: 500 });
  }
} 