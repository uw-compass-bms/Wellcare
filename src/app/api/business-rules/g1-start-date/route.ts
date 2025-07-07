import { NextRequest, NextResponse } from 'next/server';

// 请求数据类型定义 - 支持多文件数据
interface G1StartDateValidationRequest {
  mvr?: {
    // 单文件MVR数据
    date_of_birth?: string;
    expiry_date?: string;
    issue_date?: string;
    name?: string;
    licence_number?: string;
    // 多文件MVR数据
    records?: Array<{
      file_id?: string;
      file_name?: string;
      date_of_birth?: string;
      expiry_date?: string;
      issue_date?: string;
      name?: string;
      licence_number?: string;
    }>;
  };
  quote?: {
    // 单驾驶员兼容字段
    date_g1?: string;
    date_g2?: string;
    date_g?: string;
    date_insured?: string;
    date_with_company?: string;
    name?: string;
    licence_number?: string;
    // 多驾驶员数据
    vehicles?: Array<{
      drivers?: Array<{
        name: string;
        licence_number?: string;
        date_g1?: string;
        date_g2?: string;
        date_g?: string;
        date_insured?: string;
        date_with_company?: string;
        birth_date?: string;
      }>;
    }>;
  };
  autoplus?: {
    // 单文件Auto+数据
    first_insurance_date?: string;
    name?: string;
    licence_number?: string;
    // 多文件Auto+数据
    records?: Array<{
      file_id?: string;
      file_name?: string;
      first_insurance_date?: string;
      name?: string;
      licence_number?: string;
    }>;
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

    // 名字匹配函数（模糊匹配）
    const namesMatch = (name1: string | null | undefined, name2: string | null | undefined): boolean => {
      if (!name1 || !name2) return false;
      const normalize = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '');
      const n1 = normalize(name1);
      const n2 = normalize(name2);
      return n1 === n2 || n1.includes(n2) || n2.includes(n1);
    };

    // 驾照号匹配函数
    const licenseNumbersMatch = (license1: string | null | undefined, license2: string | null | undefined): boolean => {
      if (!license1 || !license2) return false;
      const normalize = (license: string) => license.replace(/[^A-Z0-9]/g, '');
      return normalize(license1) === normalize(license2);
    };

    // 收集所有驾驶员信息
    const allDrivers: Array<{
      name: string;
      licence_number?: string | null;
      date_g1?: string | null;
      date_g2?: string | null;
      date_g?: string | null;
      date_insured?: string | null;
      date_with_company?: string | null;
      birth_date?: string | null;
    }> = [];

    // 从Quote中提取驾驶员信息
    if (quote?.vehicles) {
      quote.vehicles.forEach(vehicle => {
        vehicle.drivers?.forEach(driver => {
          if (driver.name) {
            allDrivers.push({
              name: driver.name,
              licence_number: driver.licence_number,
              date_g1: driver.date_g1,
              date_g2: driver.date_g2,
              date_g: driver.date_g,
              date_insured: driver.date_insured,
              date_with_company: driver.date_with_company,
              birth_date: driver.birth_date
            });
          }
        });
      });
    }

    // 兼容单驾驶员数据
    if (quote && !allDrivers.length && quote.name) {
      allDrivers.push({
        name: quote.name,
        licence_number: quote.licence_number,
        date_g1: quote.date_g1,
        date_g2: quote.date_g2,
        date_g: quote.date_g,
        date_insured: quote.date_insured,
        date_with_company: quote.date_with_company
      });
    }

    // 收集所有MVR记录
    const allMvrRecords: Array<{
      record_id: string;
      file_name?: string;
      name?: string;
      licence_number?: string;
      date_of_birth?: string;
      expiry_date?: string;
      issue_date?: string;
    }> = [];

    if (mvr?.records) {
      mvr.records.forEach((record, index) => {
        allMvrRecords.push({
          record_id: record.file_id || `mvr_${index}`,
          file_name: record.file_name,
          name: record.name,
          licence_number: record.licence_number,
          date_of_birth: record.date_of_birth,
          expiry_date: record.expiry_date,
          issue_date: record.issue_date
        });
      });
    }

    // 兼容单MVR数据
    if (mvr && !allMvrRecords.length && mvr.date_of_birth) {
      allMvrRecords.push({
        record_id: 'mvr_single',
        name: mvr.name,
        licence_number: mvr.licence_number,
        date_of_birth: mvr.date_of_birth,
        expiry_date: mvr.expiry_date,
        issue_date: mvr.issue_date
      });
    }

    // 收集所有Auto+记录
    const allAutoPlusRecords: Array<{
      record_id: string;
      file_name?: string;
      name?: string;
      licence_number?: string;
      first_insurance_date?: string;
    }> = [];

    if (autoplus?.records) {
      autoplus.records.forEach((record, index) => {
        allAutoPlusRecords.push({
          record_id: record.file_id || `autoplus_${index}`,
          file_name: record.file_name,
          name: record.name,
          licence_number: record.licence_number,
          first_insurance_date: record.first_insurance_date
        });
      });
    }

    // 兼容单Auto+数据
    if (autoplus && !allAutoPlusRecords.length && autoplus.first_insurance_date) {
      allAutoPlusRecords.push({
        record_id: 'autoplus_single',
        name: autoplus.name,
        licence_number: autoplus.licence_number,
        first_insurance_date: autoplus.first_insurance_date
      });
    }

    // 检查是否有足够的数据进行验证
    if (allDrivers.length === 0 && allMvrRecords.length === 0) {
      const insufficientDataResult: BusinessRuleResult = {
        id: 'g1_start_date',
        name: 'G1 Start Date Validation & Cross-Document Verification',
        status: 'insufficient_data',
        recommendation: 'Upload MVR documents and/or Quote documents with driver information',
        details: 'No driver information found in uploaded documents',
        data_sources: []
      };
      return NextResponse.json(insufficientDataResult);
    }

    // 对每个驾驶员进行验证
    const driverValidations = allDrivers.map(driver => {
      const validation = {
        driver_name: driver.name,
        driver_license_number: driver.licence_number,
        mvr_matches: [] as Array<{
          mvr_record_id: string;
          mvr_file_name?: string;
          license_number_match: boolean;
          name_match: boolean;
          birth_date_match: boolean | null;
          calculated_g1_date: string | null;
          calculation_method: string;
          birth_date: string | undefined;
          expiry_date: string | undefined;
          issue_date: string | undefined;
        }>,
        autoplus_matches: [] as Array<{
          autoplus_record_id: string;
          autoplus_file_name?: string;
          license_number_match: boolean;
          name_match: boolean;
          first_insurance_date: string | undefined;
        }>,
        quote_license_dates: {
          date_g1: driver.date_g1,
          date_g2: driver.date_g2,
          date_g: driver.date_g,
          date_insured: driver.date_insured,
          date_with_company: driver.date_with_company
        },
        validation_result: {
          g1_calculation_successful: false,
          g1_dates_consistent: false,
          ten_year_rule_triggered: false,
          license_insurance_years_diff: null as number | null,
          issues: [] as string[],
          warnings: [] as string[],
          recommendations: [] as string[]
        }
      };

      // 匹配MVR记录
      allMvrRecords.forEach(mvrRecord => {
        const nameMatch = namesMatch(driver.name, mvrRecord.name);
        const licenseMatch = licenseNumbersMatch(driver.licence_number, mvrRecord.licence_number);
        const birthDateMatch = driver.birth_date ? datesAreClose(driver.birth_date, mvrRecord.date_of_birth, 1) : null;

        if (nameMatch || licenseMatch || birthDateMatch) {
          // 计算G1日期
          let calculatedG1Date: string | null = null;
          let calculationMethod = '';
          let g1CalculationValid = false;

          if (mvrRecord.date_of_birth && mvrRecord.expiry_date) {
            const birthMonthDay = getMonthDay(mvrRecord.date_of_birth);
            const expiryMonthDay = getMonthDay(mvrRecord.expiry_date);

            if (birthMonthDay && expiryMonthDay && birthMonthDay === expiryMonthDay) {
              // 月日一致：使用Issue Date作为G1起始时间
              if (mvrRecord.issue_date) {
                calculatedG1Date = mvrRecord.issue_date;
                calculationMethod = 'Used Issue Date (Birth Date and Expiry Date have matching month/day)';
                g1CalculationValid = true;
              }
            } else {
              // 月日不一致：到期日减去5年
              calculatedG1Date = subtractYears(mvrRecord.expiry_date, 5);
              calculationMethod = 'Expiry Date minus 5 years (Birth Date and Expiry Date have different month/day)';
              
              if (calculatedG1Date && mvrRecord.date_of_birth) {
                // 验证推算的G1日期是否合理（应该在16岁之后）
                const birthYear = new Date(mvrRecord.date_of_birth).getFullYear();
                const calculatedYear = new Date(calculatedG1Date).getFullYear();
                const ageAtG1 = calculatedYear - birthYear;
                g1CalculationValid = ageAtG1 >= 16 && ageAtG1 <= 25;
              }
            }
          }

          validation.mvr_matches.push({
            mvr_record_id: mvrRecord.record_id,
            mvr_file_name: mvrRecord.file_name,
            license_number_match: licenseMatch,
            name_match: nameMatch,
            birth_date_match: birthDateMatch,
            calculated_g1_date: calculatedG1Date,
            calculation_method: calculationMethod,
            birth_date: mvrRecord.date_of_birth,
            expiry_date: mvrRecord.expiry_date,
            issue_date: mvrRecord.issue_date
          });

          if (g1CalculationValid) {
            validation.validation_result.g1_calculation_successful = true;
            
            // 检查与Quote中G1日期的一致性
            if (driver.date_g1 && calculatedG1Date) {
              if (datesAreClose(calculatedG1Date, driver.date_g1)) {
                validation.validation_result.g1_dates_consistent = true;
              } else {
                validation.validation_result.warnings.push(
                  `Quote G1 date (${formatDate(driver.date_g1)}) differs from MVR calculated G1 date (${formatDate(calculatedG1Date)})`
                );
              }
            }
          } else {
            validation.validation_result.issues.push(
              `MVR G1 date calculation failed or unreasonable for record ${mvrRecord.record_id}`
            );
          }
        }
      });

      // 匹配Auto+记录
      allAutoPlusRecords.forEach(autoPlusRecord => {
        const nameMatch = namesMatch(driver.name, autoPlusRecord.name);
        const licenseMatch = licenseNumbersMatch(driver.licence_number, autoPlusRecord.licence_number);

        if (nameMatch || licenseMatch) {
          validation.autoplus_matches.push({
            autoplus_record_id: autoPlusRecord.record_id,
            autoplus_file_name: autoPlusRecord.file_name,
            license_number_match: licenseMatch,
            name_match: nameMatch,
            first_insurance_date: autoPlusRecord.first_insurance_date
          });

          // 检查10年规则
          if (autoPlusRecord.first_insurance_date) {
            const licenseDate = driver.date_g2 || driver.date_g;
            
            if (licenseDate) {
              const yearsDiff = getYearsDifference(licenseDate, autoPlusRecord.first_insurance_date);
              
              if (yearsDiff !== null) {
                validation.validation_result.license_insurance_years_diff = yearsDiff;
                
                if (yearsDiff >= 10) {
                  validation.validation_result.ten_year_rule_triggered = true;
                  validation.validation_result.issues.push(
                    `G2/G license date (${formatDate(licenseDate)}) is ${yearsDiff.toFixed(1)} years earlier than first insurance date (${formatDate(autoPlusRecord.first_insurance_date)}) - Driver's License History must be obtained`
                  );
                }
              }
            }
          }
        }
      });

      // 如果没有匹配到任何MVR记录
      if (validation.mvr_matches.length === 0) {
        validation.validation_result.warnings.push(
          `No matching MVR record found for driver ${driver.name}`
        );
      }

      // 如果没有匹配到任何Auto+记录
      if (validation.autoplus_matches.length === 0) {
        validation.validation_result.warnings.push(
          `No matching Auto+ record found for driver ${driver.name}`
        );
      }

      // 生成建议
      if (validation.validation_result.issues.length > 0) {
        if (validation.validation_result.ten_year_rule_triggered) {
          validation.validation_result.recommendations.push(
            'Driver\'s License History must be obtained to verify the license dates'
          );
        } else {
          validation.validation_result.recommendations.push(
            'Contact customer to confirm actual G1 acquisition date or provide Driver\'s License History'
          );
        }
      } else if (validation.validation_result.warnings.length > 0) {
        validation.validation_result.recommendations.push(
          'Review date discrepancies and consider contacting customer for clarification'
        );
      }

      return validation;
    });

    // 计算统计信息
    const summary = {
      total_drivers: allDrivers.length,
      total_mvr_records: allMvrRecords.length,
      total_autoplus_records: allAutoPlusRecords.length,
      drivers_with_issues: driverValidations.filter(v => v.validation_result.issues.length > 0).length,
      drivers_with_warnings: driverValidations.filter(v => v.validation_result.warnings.length > 0).length,
      unmatched_drivers: driverValidations.filter(v => v.mvr_matches.length === 0 && v.autoplus_matches.length === 0).length,
      unmatched_mvr_records: allMvrRecords.filter(mvr => 
        !driverValidations.some(driver => 
          driver.mvr_matches.some(match => match.mvr_record_id === mvr.record_id)
        )
      ).length,
      unmatched_autoplus_records: allAutoPlusRecords.filter(autoplus => 
        !driverValidations.some(driver => 
          driver.autoplus_matches.some(match => match.autoplus_record_id === autoplus.record_id)
        )
      ).length
    };

    // 确定最终状态和建议
    const allIssues = driverValidations.flatMap(v => v.validation_result.issues);
    const allWarnings = driverValidations.flatMap(v => v.validation_result.warnings);
    const allRecommendations = driverValidations.flatMap(v => v.validation_result.recommendations);

    let finalStatus: 'passed' | 'failed' | 'requires_review' | 'insufficient_data';
    let recommendation: string;
    let details: string;

    if (allIssues.length > 0) {
      finalStatus = 'failed';
      recommendation = Array.from(new Set(allRecommendations)).join('; ') || 'Contact customer to resolve identified issues';
      details = `Found ${allIssues.length} issue(s) across ${summary.drivers_with_issues} driver(s): ${allIssues.join('. ')}`;
    } else if (allWarnings.length > 0) {
      finalStatus = 'requires_review';
      recommendation = 'Review date discrepancies and consider contacting customer for clarification';
      details = `Found ${allWarnings.length} warning(s) across ${summary.drivers_with_warnings} driver(s): ${allWarnings.join('. ')}`;
    } else {
      finalStatus = 'passed';
      recommendation = 'No further action required. All G1 date validations passed.';
      details = `Successfully validated ${summary.total_drivers} driver(s) against ${summary.total_mvr_records} MVR record(s) and ${summary.total_autoplus_records} Auto+ record(s)`;
    }

    // 构建数据源列表
    const dataSources = [];
    if (summary.total_mvr_records > 0) dataSources.push('MVR');
    if (summary.total_autoplus_records > 0) dataSources.push('Auto+');
    if (summary.total_drivers > 0) dataSources.push('Quote');

    // 兼容性：保留原有的单驾驶员字段
    const legacyFields = driverValidations.length > 0 ? {
      mvr_calculated_g1_date: driverValidations[0].mvr_matches[0]?.calculated_g1_date || null,
      calculation_method: driverValidations[0].mvr_matches[0]?.calculation_method || '',
      birth_date: driverValidations[0].mvr_matches[0]?.birth_date || null,
      expiry_date: driverValidations[0].mvr_matches[0]?.expiry_date || null,
      issue_date: driverValidations[0].mvr_matches[0]?.issue_date || null,
      quote_g1_date: driverValidations[0].quote_license_dates?.date_g1 || null,
      quote_g2_date: driverValidations[0].quote_license_dates?.date_g2 || null,
      quote_g_date: driverValidations[0].quote_license_dates?.date_g || null,
      first_insurance_date: driverValidations[0].autoplus_matches[0]?.first_insurance_date || null,
      ten_year_rule_triggered: driverValidations[0].validation_result.ten_year_rule_triggered,
      g1_dates_match: driverValidations[0].validation_result.g1_dates_consistent,
      license_insurance_years_diff: driverValidations[0].validation_result.license_insurance_years_diff
    } : {};

    const ruleResult: BusinessRuleResult = {
      id: 'g1_start_date',
      name: 'G1 Start Date Validation & Cross-Document Verification',
      status: finalStatus,
      result: {
        ...legacyFields,
        driver_validations: driverValidations,
        summary: summary
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