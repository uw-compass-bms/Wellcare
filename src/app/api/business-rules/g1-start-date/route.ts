import { NextRequest, NextResponse } from 'next/server';

// 请求数据类型定义
interface G1StartDateValidationRequest {
  mvr?: {
    date_of_birth?: string;
    expiry_date?: string;
    issue_date?: string;
  };
  quote?: {
    date_g1?: string;
    date_g2?: string;
    date_g?: string;
  };
  autoplus?: {
    first_insurance_date?: string;
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
    const { mvr, quote, autoplus }: G1StartDateValidationRequest = await request.json();

    // 工具函数 - 从原组件迁移
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

    const getYearsDifference = (earlierDate: string | null | undefined, laterDate: string | null | undefined): number | null => {
      if (!earlierDate || !laterDate) return null;
      try {
        const earlier = new Date(earlierDate);
        const later = new Date(laterDate);
        const diffTime = later.getTime() - earlier.getTime();
        const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25); // 考虑闰年
        return Math.abs(diffYears);
      } catch {
        return null;
      }
    };

    const datesAreClose = (date1: string | null | undefined, date2: string | null | undefined, toleranceDays: number = 30): boolean => {
      if (!date1 || !date2) return false;
      try {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays <= toleranceDays;
      } catch {
        return false;
      }
    };

    // 检查必要数据是否存在
    if (!mvr || !mvr.date_of_birth || !mvr.expiry_date) {
      const insufficientDataResult: BusinessRuleResult = {
        id: 'g1_start_date',
        name: 'G1 Start Date Validation & Cross-Document Verification',
        status: 'insufficient_data',
        recommendation: 'Upload complete MVR document with Birth Date and Expiry Date',
        details: 'Missing required MVR data: Birth Date or Expiry Date not found',
        data_sources: ['MVR']
      };
      return NextResponse.json(insufficientDataResult);
    }

    // 获取所有相关数据
    const birthDate = mvr.date_of_birth;
    const expiryDate = mvr.expiry_date;
    const issueDate = mvr.issue_date;
    const quoteG1Date = quote?.date_g1;
    const quoteG2Date = quote?.date_g2;
    const quoteGDate = quote?.date_g;
    const firstInsuranceDate = autoplus?.first_insurance_date;

    // 第一步：计算MVR的G1日期（保持原有逻辑）
    const birthMonthDay = getMonthDay(birthDate);
    const expiryMonthDay = getMonthDay(expiryDate);
    let calculatedG1Date: string | null = null;
    let calculationMethod = '';
    let g1CalculationValid = false;

    if (birthMonthDay && expiryMonthDay && birthMonthDay === expiryMonthDay) {
      // 月日一致：使用Issue Date作为G1起始时间
      if (issueDate) {
        calculatedG1Date = issueDate;
        calculationMethod = 'Used Issue Date (Birth Date and Expiry Date have matching month/day)';
        g1CalculationValid = true;
      }
    } else {
      // 月日不一致：到期日减去5年
      calculatedG1Date = subtractYears(expiryDate, 5);
      calculationMethod = 'Expiry Date minus 5 years (Birth Date and Expiry Date have different month/day)';
      
      if (calculatedG1Date) {
        // 验证推算的G1日期是否合理（应该在16岁之后）
        const birthYear = new Date(birthDate).getFullYear();
        const calculatedYear = new Date(calculatedG1Date).getFullYear();
        const ageAtG1 = calculatedYear - birthYear;
        g1CalculationValid = ageAtG1 >= 16 && ageAtG1 <= 25;
      }
    }

    // 第二步：跨文档日期对比
    const issues: string[] = [];
    const warnings: string[] = [];
    const successes: string[] = [];
    const dataSources: string[] = ['MVR'];

    // MVR G1日期计算结果
    if (g1CalculationValid && calculatedG1Date) {
      successes.push(`MVR G1 date calculated successfully: ${formatDate(calculatedG1Date)}`);
    } else {
      issues.push('MVR G1 date calculation failed or unreasonable');
    }

    // Quote G1日期对比
    if (quoteG1Date && calculatedG1Date) {
      dataSources.push('Quote');
      if (datesAreClose(calculatedG1Date, quoteG1Date)) {
        successes.push(`Quote G1 date matches MVR calculated G1 date (${formatDate(quoteG1Date)})`);
      } else {
        warnings.push(`Quote G1 date (${formatDate(quoteG1Date)}) differs from MVR calculated G1 date (${formatDate(calculatedG1Date)})`);
      }
    } else if (quoteG1Date) {
      dataSources.push('Quote');
      warnings.push('Quote G1 date available but MVR G1 calculation failed');
    }

    // 第三步：10年规则验证
    let tenYearRuleTriggered = false;
    if (firstInsuranceDate && autoplus) {
      dataSources.push('Auto+');
      
      // 确定G2/G日期（优先使用G2，如果没有则使用G）
      const licenseDate = quoteG2Date || quoteGDate;
      
      if (licenseDate) {
        const yearsDiff = getYearsDifference(licenseDate, firstInsuranceDate);
        
        if (yearsDiff !== null && yearsDiff >= 10) {
          tenYearRuleTriggered = true;
          issues.push(`G2/G license date (${formatDate(licenseDate)}) is ${yearsDiff.toFixed(1)} years earlier than first insurance date (${formatDate(firstInsuranceDate)}) - Driver's License History must be obtained to verify license dates`);
        } else if (yearsDiff !== null) {
          successes.push(`G2/G license date (${formatDate(licenseDate)}) and first insurance date (${formatDate(firstInsuranceDate)}) are within acceptable range (${yearsDiff.toFixed(1)} years)`);
        }
      } else {
        warnings.push('G2/G license date not available from Quote - cannot verify 10-year rule');
      }
    }

    // 第四步：确定最终状态和建议
    let finalStatus: 'passed' | 'failed' | 'requires_review' | 'insufficient_data';
    let recommendation: string;
    let details: string;

    if (issues.length > 0) {
      finalStatus = 'failed';
      if (tenYearRuleTriggered) {
        recommendation = 'Driver\'s License History must be obtained to verify the license dates';
      } else {
        recommendation = 'Contact customer to confirm actual G1 acquisition date or provide Driver\'s License History';
      }
      details = issues.join('. ') + (warnings.length > 0 ? '. Additional warnings: ' + warnings.join('. ') : '');
    } else if (warnings.length > 0) {
      finalStatus = 'requires_review';
      recommendation = 'Review date discrepancies and consider contacting customer for clarification';
      details = warnings.join('. ') + (successes.length > 0 ? '. Successful validations: ' + successes.join('. ') : '');
    } else {
      finalStatus = 'passed';
      recommendation = 'No further action required. All G1 date validations passed.';
      details = successes.join('. ');
    }

    const ruleResult: BusinessRuleResult = {
      id: 'g1_start_date',
      name: 'G1 Start Date Validation & Cross-Document Verification',
      status: finalStatus,
      result: {
        mvr_calculated_g1_date: formatDate(calculatedG1Date),
        calculation_method: calculationMethod,
        quote_g1_date: formatDate(quoteG1Date || null),
        quote_g2_date: formatDate(quoteG2Date || null),
        quote_g_date: formatDate(quoteGDate || null),
        first_insurance_date: formatDate(firstInsuranceDate || null),
        birth_date: formatDate(birthDate),
        expiry_date: formatDate(expiryDate),
        issue_date: formatDate(issueDate),
        ten_year_rule_triggered: tenYearRuleTriggered,
        g1_dates_match: calculatedG1Date && quoteG1Date ? datesAreClose(calculatedG1Date, quoteG1Date) : null,
        license_insurance_years_diff: firstInsuranceDate && (quoteG2Date || quoteGDate) ? 
          getYearsDifference(quoteG2Date || quoteGDate, firstInsuranceDate) : null
      },
      recommendation,
      details,
      data_sources: dataSources
    };

    return NextResponse.json(ruleResult);

  } catch (error) {
    console.error('G1 start date validation error:', error);
    
    const errorResult: BusinessRuleResult = {
      id: 'g1_start_date',
      name: 'G1 Start Date Validation & Cross-Document Verification',
      status: 'failed',
      recommendation: 'System error occurred during validation',
      details: 'An unexpected error occurred while processing the G1 start date validation. Please try again.',
      data_sources: []
    };
    
    return NextResponse.json(errorResult, { status: 500 });
  }
} 