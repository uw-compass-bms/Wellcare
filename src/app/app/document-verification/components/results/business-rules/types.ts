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

// 日期处理工具函数
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD格式
  } catch {
    return dateString;
  }
};

// 获取月日部分 (MM-DD格式)
export const getMonthDay = (dateString: string | null): string | null => {
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

// 日期减去年数
export const subtractYears = (dateString: string | null, years: number): string | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    date.setFullYear(date.getFullYear() - years);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD格式
  } catch {
    return null;
  }
};

// 计算两个日期之间的年数差异
export const getYearsDifference = (earlierDate: string | null, laterDate: string | null): number | null => {
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

// 比较两个日期是否相同（容忍度为30天）
export const datesAreClose = (date1: string | null, date2: string | null, toleranceDays: number = 30): boolean => {
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