// 业务规则验证状态枚举
export type RuleStatus = 'passed' | 'failed' | 'requires_review' | 'insufficient_data';

// 业务规则验证结果接口
// 年度里程验证结果
export interface AnnualMileageResult {
  reported_distance?: string;
  parsed_distance?: number | string;
  threshold?: number;
  commute_distance?: string;
  parsed_commute?: number | null;
  commute_threshold?: number;
  classification?: string;
  issues?: string[];
}

// 新司机验证结果
export interface NewDriverResult {
  first_insurance_date?: string | null;
  years_of_history?: string | number;
  is_new_driver?: boolean;
  reason?: string;
}

// G1起始日期验证结果
export interface G1StartDateResult {
  // 原有的单驾驶员字段保持兼容
  mvr_calculated_g1_date?: string | null;
  calculation_method?: string;
  birth_date?: string | null;
  expiry_date?: string | null;
  issue_date?: string | null;
  quote_g1_date?: string | null;
  quote_g2_date?: string | null;
  quote_g_date?: string | null;
  first_insurance_date?: string | null;
  ten_year_rule_triggered?: boolean;
  g1_dates_match?: boolean | null;
  license_insurance_years_diff?: number | null;
  
  // 新增：多驾驶员验证结果
  driver_validations?: Array<{
    driver_name: string;
    driver_license_number?: string | null;
    
    // MVR匹配结果
    mvr_matches?: Array<{
      mvr_record_id?: string;
      mvr_file_name?: string;
      license_number_match: boolean;
      name_match: boolean;
      birth_date_match: boolean;
      calculated_g1_date?: string | null;
      calculation_method?: string;
      birth_date?: string | null;
      expiry_date?: string | null;
      issue_date?: string | null;
    }>;
    
    // Auto+匹配结果
    autoplus_matches?: Array<{
      autoplus_record_id?: string;
      autoplus_file_name?: string;
      license_number_match: boolean;
      name_match: boolean;
      first_insurance_date?: string | null;
    }>;
    
    // Quote中的驾照日期
    quote_license_dates?: {
      date_g1?: string | null;
      date_g2?: string | null;
      date_g?: string | null;
      date_insured?: string | null;
      date_with_company?: string | null;
    };
    
    // 该驾驶员的验证结果
    validation_result: {
      g1_calculation_successful: boolean;
      g1_dates_consistent: boolean;
      ten_year_rule_triggered: boolean;
      license_insurance_years_diff?: number | null;
      issues: string[];
      warnings: string[];
      recommendations: string[];
    };
  }>;
  
  // 总体统计
  summary?: {
    total_drivers: number;
    total_mvr_records: number;
    total_autoplus_records: number;
    drivers_with_issues: number;
    drivers_with_warnings: number;
    unmatched_drivers: number;
    unmatched_mvr_records: number;
    unmatched_autoplus_records: number;
  };
}

// 车辆年龄与保险覆盖验证结果
export interface VehicleAgeResult {
  vehicle_year?: string | null;
    vehicle_age?: number;
  current_year?: number;
  coverage_details?: {
    liability?: string | null;
    comprehensive?: boolean;
    collision?: boolean;
    all_perils?: boolean;
  };
  risk_level?: 'high' | 'medium' | 'low';
}

export interface BusinessRuleResult {
  id: string;
  name: string;
  status: RuleStatus;
  result?: AnnualMileageResult | NewDriverResult | G1StartDateResult | VehicleAgeResult | Record<string, unknown>; // 推算的结果值
  recommendation: string; // 操作建议
  details: string; // 详细说明
  data_sources?: string[]; // 使用的数据源
}

// 业务规则组件的通用Props接口
export interface BusinessRuleProps {
  documents: {
    mvr?: Record<string, unknown>;
    application?: Record<string, unknown>;
    autoplus?: Record<string, unknown>;
    quote?: Record<string, unknown>;
  };
  onResultChange?: (result: BusinessRuleResult) => void;
}

// 规则状态对应的样式配置
export const RULE_STATUS_CONFIG: Record<RuleStatus, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}> = {
  passed: {
    color: 'text-green-800',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: '✓'
  },
  failed: {
    color: 'text-red-800',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: '✗'
  },
  requires_review: {
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: '⚠'
  },
  insufficient_data: {
    color: 'text-gray-800',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: '?'
  }
};

// 注意：所有工具函数已迁移到各自的后端API中
// 这样可以确保业务逻辑的集中管理和一致性 