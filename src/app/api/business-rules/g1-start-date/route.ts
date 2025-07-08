import { NextRequest, NextResponse } from 'next/server';

// MVR数据类型
interface MvrDriver {
  name: string | null;
  licence_number: string | null;
  date_of_birth: string | null;
  expiry_date: string | null;
  issue_date: string | null;
}

// Quote驾驶员数据类型
interface QuoteDriver {
  name: string;
  licence_number: string;
  date_g1: string | null;
}

// 请求数据类型定义 - 支持多驾驶员
interface G1StartDateValidationRequest {
  mvr?: {
    records?: MvrDriver[]; // 支持多个MVR记录
    // 向后兼容的单个记录字段
    name?: string;
    licence_number?: string;
    date_of_birth?: string;
    expiry_date?: string;
    issue_date?: string;
  };
  quote?: {
    drivers?: QuoteDriver[]; // 支持多个驾驶员
    // 向后兼容的单个驾驶员字段
    date_g1?: string;
  };
}

// 单个驾驶员验证结果
interface SingleDriverG1Result {
  driver_name: string;
  mvr_licence_number: string | null;
  quote_licence_number: string | null;
  match_status: 'exact_match' | 'partial_match' | 'no_match' | 'no_quote_data';
  
  mvr_calculated_g1_date: string | null;
  calculation_method: string;
  birth_date: string | null;
  expiry_date: string | null;
  issue_date: string | null;
  birth_month_day: string | null;
  expiry_month_day: string | null;
  
  quote_g1_date: string | null;
  dates_match: boolean;
  date_difference_days: number | null;
  
  driver_status: 'passed' | 'failed' | 'requires_review' | 'insufficient_data';
  driver_recommendation: string;
  driver_details: string;
}

// 多驾驶员验证结果
interface MultiDriverG1Result {
  drivers: SingleDriverG1Result[];
  summary: {
    total_drivers: number;
    matched_drivers: number;
    passed_validations: number;
    failed_validations: number;
    requires_review: number;
    insufficient_data: number;
  };
  overall_status: 'passed' | 'failed' | 'requires_review' | 'insufficient_data';
}

// 业务规则结果类型
interface BusinessRuleResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'requires_review' | 'insufficient_data';
  result?: MultiDriverG1Result | {
    // 向后兼容的单驾驶员结果
    mvr_calculated_g1_date: string | null;
    calculation_method: string;
    birth_date: string | null;
    expiry_date: string | null;
    issue_date: string | null;
    birth_month_day: string | null;
    expiry_month_day: string | null;
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

    // 驾驶员匹配逻辑
    const matchDrivers = (mvrDrivers: MvrDriver[], quoteDrivers: QuoteDriver[]): Array<{
      mvrDriver: MvrDriver | null;
      quoteDriver: QuoteDriver | null;
      matchStatus: 'exact_match' | 'partial_match' | 'no_match' | 'no_quote_data';
    }> => {
      const matches: Array<{
        mvrDriver: MvrDriver | null;
        quoteDriver: QuoteDriver | null;
        matchStatus: 'exact_match' | 'partial_match' | 'no_match' | 'no_quote_data';
      }> = [];

      const usedQuoteDrivers = new Set<number>();

      // 为每个MVR驾驶员寻找匹配的Quote驾驶员
      mvrDrivers.forEach((mvrDriver) => {
        if (!mvrDriver.name || !mvrDriver.licence_number) {
          matches.push({
            mvrDriver,
            quoteDriver: null,
            matchStatus: 'no_match'
          });
          return;
        }

        // 寻找精确匹配（姓名和驾照号都匹配）
        const exactMatch = quoteDrivers.findIndex((quoteDriver, index) => {
          return !usedQuoteDrivers.has(index) &&
                 quoteDriver.name === mvrDriver.name &&
                 quoteDriver.licence_number === mvrDriver.licence_number;
        });

        if (exactMatch !== -1) {
          matches.push({
            mvrDriver,
            quoteDriver: quoteDrivers[exactMatch],
            matchStatus: 'exact_match'
          });
          usedQuoteDrivers.add(exactMatch);
          return;
        }

        // 寻找部分匹配（只有姓名匹配或只有驾照号匹配）
        const partialMatch = quoteDrivers.findIndex((quoteDriver, index) => {
          return !usedQuoteDrivers.has(index) &&
                 (quoteDriver.name === mvrDriver.name || quoteDriver.licence_number === mvrDriver.licence_number);
        });

        if (partialMatch !== -1) {
          matches.push({
            mvrDriver,
            quoteDriver: quoteDrivers[partialMatch],
            matchStatus: 'partial_match'
          });
          usedQuoteDrivers.add(partialMatch);
          return;
        }

        // 没有找到匹配
        matches.push({
          mvrDriver,
          quoteDriver: null,
          matchStatus: 'no_match'
        });
      });

      return matches;
    };

    // 单个驾驶员G1验证逻辑
    const validateSingleDriver = (
      mvrDriver: MvrDriver | null,
      quoteDriver: QuoteDriver | null,
      matchStatus: 'exact_match' | 'partial_match' | 'no_match' | 'no_quote_data'
    ): SingleDriverG1Result => {
      const driverName = mvrDriver?.name || quoteDriver?.name || 'Unknown Driver';
      
      // 如果没有MVR数据，无法进行G1计算
      if (!mvrDriver || !mvrDriver.date_of_birth || !mvrDriver.expiry_date) {
        return {
          driver_name: driverName,
          mvr_licence_number: mvrDriver?.licence_number || null,
          quote_licence_number: quoteDriver?.licence_number || null,
          match_status: matchStatus,
          mvr_calculated_g1_date: null,
          calculation_method: 'Insufficient MVR data',
          birth_date: mvrDriver?.date_of_birth || null,
          expiry_date: mvrDriver?.expiry_date || null,
          issue_date: mvrDriver?.issue_date || null,
          birth_month_day: null,
          expiry_month_day: null,
          quote_g1_date: quoteDriver?.date_g1 || null,
          dates_match: false,
          date_difference_days: null,
          driver_status: 'insufficient_data',
          driver_recommendation: 'Missing required MVR data for G1 calculation',
          driver_details: 'Birth date and expiry date are required for G1 calculation'
        };
      }

      // 步骤1：计算G1日期
      let calculatedG1Date: string | null = null;
      let calculationMethod = '';
      
      const birthMonthDay = getMonthDay(mvrDriver.date_of_birth);
      const expiryMonthDay = getMonthDay(mvrDriver.expiry_date);
      
      if (birthMonthDay && expiryMonthDay) {
        if (birthMonthDay === expiryMonthDay) {
          // 月日一致：使用Issue Date
          if (mvrDriver.issue_date) {
            calculatedG1Date = mvrDriver.issue_date;
            calculationMethod = 'Used Issue Date (Birth date and Expiry date have matching month/day)';
          } else {
            calculationMethod = 'Issue Date not available (Birth date and Expiry date have matching month/day)';
          }
        } else {
          // 月日不一致：Expiry Date减5年
          calculatedG1Date = subtractYears(mvrDriver.expiry_date, 5);
          calculationMethod = 'Expiry Date minus 5 years (Birth date and Expiry date have different month/day)';
        }
      }

      // 步骤2：与Quote中的G1日期对比
      const quoteG1Date = quoteDriver?.date_g1 || null;
      let datesMatch = false;
      let dateDifferenceDays: number | null = null;

      if (calculatedG1Date && quoteG1Date) {
        dateDifferenceDays = getDaysDifference(calculatedG1Date, quoteG1Date);
        datesMatch = dateDifferenceDays !== null && dateDifferenceDays <= 30; // 容忍30天差异
      }

      // 步骤3：确定验证结果
      let driverStatus: 'passed' | 'failed' | 'requires_review' | 'insufficient_data';
      let driverRecommendation: string;
      let driverDetails: string;

      if (!calculatedG1Date) {
        driverStatus = 'failed';
        driverRecommendation = 'Unable to calculate G1 date from MVR data';
        driverDetails = 'G1 date calculation failed. Please verify MVR data completeness.';
      } else if (!quoteG1Date) {
        driverStatus = 'requires_review';
        driverRecommendation = 'G1 date calculated from MVR, but no Quote G1 date available for comparison';
        driverDetails = `Calculated G1 date: ${formatDate(calculatedG1Date)}. Quote G1 date not provided.`;
      } else if (datesMatch) {
        driverStatus = 'passed';
        driverRecommendation = 'G1 dates match between MVR and Quote';
        driverDetails = `MVR calculated G1 date (${formatDate(calculatedG1Date)}) matches Quote G1 date (${formatDate(quoteG1Date)}) within acceptable range.`;
      } else {
        driverStatus = 'failed';
        driverRecommendation = 'G1 dates do not match between MVR and Quote';
        driverDetails = `MVR calculated G1 date (${formatDate(calculatedG1Date)}) differs from Quote G1 date (${formatDate(quoteG1Date)}) by ${dateDifferenceDays} days.`;
      }

      return {
        driver_name: driverName,
        mvr_licence_number: mvrDriver.licence_number,
        quote_licence_number: quoteDriver?.licence_number || null,
        match_status: matchStatus,
        mvr_calculated_g1_date: calculatedG1Date,
        calculation_method: calculationMethod,
        birth_date: mvrDriver.date_of_birth,
        expiry_date: mvrDriver.expiry_date,
        issue_date: mvrDriver.issue_date,
        birth_month_day: birthMonthDay,
        expiry_month_day: expiryMonthDay,
        quote_g1_date: quoteG1Date,
        dates_match: datesMatch,
        date_difference_days: dateDifferenceDays,
        driver_status: driverStatus,
        driver_recommendation: driverRecommendation,
        driver_details: driverDetails
      };
    };

    // 准备MVR驾驶员数据
    const mvrDrivers: MvrDriver[] = [];
    if (mvr?.records && Array.isArray(mvr.records)) {
      // 多个MVR记录
      mvrDrivers.push(...mvr.records);
    } else if (mvr?.name && mvr?.licence_number) {
      // 单个MVR记录（向后兼容）
      mvrDrivers.push({
        name: mvr.name || null,
        licence_number: mvr.licence_number || null,
        date_of_birth: mvr.date_of_birth || null,
        expiry_date: mvr.expiry_date || null,
        issue_date: mvr.issue_date || null
      });
    }

    // 准备Quote驾驶员数据
    const quoteDrivers: QuoteDriver[] = [];
    if (quote?.drivers && Array.isArray(quote.drivers)) {
      // 多个驾驶员
      quoteDrivers.push(...quote.drivers);
    } else if (quote?.date_g1) {
      // 单个驾驶员（向后兼容）
      // 从第一个MVR驾驶员获取姓名和驾照号
      const firstMvrDriver = mvrDrivers[0];
      if (firstMvrDriver?.name && firstMvrDriver?.licence_number) {
        quoteDrivers.push({
          name: firstMvrDriver.name,
          licence_number: firstMvrDriver.licence_number,
          date_g1: quote.date_g1
        });
      }
    }

    // 如果没有驾驶员数据，返回数据不足
    if (mvrDrivers.length === 0) {
      return NextResponse.json({
        id: 'g1_start_date',
        name: 'G1 Start Date Validation',
        status: 'insufficient_data',
        recommendation: 'Upload MVR document with driver information',
        details: 'No MVR driver data available for G1 calculation',
        data_sources: []
      } as BusinessRuleResult);
    }

    // 匹配驾驶员
    const matches = matchDrivers(mvrDrivers, quoteDrivers);

    // 验证每个驾驶员
    const driverResults: SingleDriverG1Result[] = matches.map(match => 
      validateSingleDriver(match.mvrDriver, match.quoteDriver, match.matchStatus)
    );

    // 计算总结
    const summary = {
      total_drivers: driverResults.length,
      matched_drivers: driverResults.filter(d => d.match_status === 'exact_match' || d.match_status === 'partial_match').length,
      passed_validations: driverResults.filter(d => d.driver_status === 'passed').length,
      failed_validations: driverResults.filter(d => d.driver_status === 'failed').length,
      requires_review: driverResults.filter(d => d.driver_status === 'requires_review').length,
      insufficient_data: driverResults.filter(d => d.driver_status === 'insufficient_data').length
    };

    // 确定整体状态
    let overallStatus: 'passed' | 'failed' | 'requires_review' | 'insufficient_data';
    if (summary.failed_validations > 0) {
      overallStatus = 'failed';
    } else if (summary.requires_review > 0 || summary.insufficient_data > 0) {
      overallStatus = 'requires_review';
    } else if (summary.passed_validations > 0) {
      overallStatus = 'passed';
    } else {
      overallStatus = 'insufficient_data';
    }

    // 生成整体推荐和详情
    let overallRecommendation: string;
    let overallDetails: string;

    if (overallStatus === 'passed') {
      overallRecommendation = `All ${summary.passed_validations} driver(s) passed G1 validation`;
      overallDetails = `Successfully validated G1 dates for all drivers. ${summary.matched_drivers} of ${summary.total_drivers} drivers matched between MVR and Quote.`;
    } else if (overallStatus === 'failed') {
      overallRecommendation = `${summary.failed_validations} driver(s) failed G1 validation`;
      overallDetails = `G1 validation failed for ${summary.failed_validations} drivers. Please review the individual driver results for details.`;
    } else if (overallStatus === 'requires_review') {
      overallRecommendation = `${summary.requires_review + summary.insufficient_data} driver(s) require manual review`;
      overallDetails = `Some drivers require manual review due to missing data or matching issues. ${summary.matched_drivers} of ${summary.total_drivers} drivers matched between MVR and Quote.`;
    } else {
      overallRecommendation = 'Insufficient data for G1 validation';
      overallDetails = 'Unable to perform G1 validation due to missing driver data.';
    }

    // 构建数据源列表
    const dataSources = [];
    if (mvr) dataSources.push('MVR');
    if (quote) dataSources.push('Quote');

    const multiDriverResult: MultiDriverG1Result = {
      drivers: driverResults,
      summary,
      overall_status: overallStatus
    };

    // 如果只有一个驾驶员，也返回向后兼容的结果格式
    if (driverResults.length === 1) {
      const singleDriver = driverResults[0];
      const result: BusinessRuleResult = {
        id: 'g1_start_date',
        name: 'G1 Start Date Validation',
        status: singleDriver.driver_status,
        result: {
          mvr_calculated_g1_date: singleDriver.mvr_calculated_g1_date,
          calculation_method: singleDriver.calculation_method,
          birth_date: singleDriver.birth_date,
          expiry_date: singleDriver.expiry_date,
          issue_date: singleDriver.issue_date,
          birth_month_day: singleDriver.birth_month_day,
          expiry_month_day: singleDriver.expiry_month_day,
          quote_g1_date: singleDriver.quote_g1_date,
          dates_match: singleDriver.dates_match,
          date_difference_days: singleDriver.date_difference_days
        },
        recommendation: singleDriver.driver_recommendation,
        details: singleDriver.driver_details,
        data_sources: dataSources
      };
      return NextResponse.json(result);
    }

    // 多驾驶员结果
    const result: BusinessRuleResult = {
      id: 'g1_start_date',
      name: 'G1 Start Date Validation',
      status: overallStatus,
      result: multiDriverResult,
      recommendation: overallRecommendation,
      details: overallDetails,
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