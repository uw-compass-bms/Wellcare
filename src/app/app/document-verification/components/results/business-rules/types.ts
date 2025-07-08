// 业务规则验证状态枚举
export type RuleStatus = 'passed' | 'failed' | 'requires_review' | 'insufficient_data';

// 业务规则验证结果接口
// 年度里程验证结果
// 单车辆年里程验证结果
export interface SingleVehicleAnnualMileageResult {
  vehicle_id?: string;
  vehicle_info?: string; // 车辆信息描述
  
  // Quote数据
  annual_km?: string;
  commute_distance?: string;
  
  // 验证结果
  status?: 'passed' | 'failed' | 'requires_review';
}

// 多车辆年里程验证汇总结果
export interface AnnualMileageResult {
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

// 单驾驶员新司机验证结果
export interface SingleDriverNewDriverResult {
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
export interface NewDriverResult {
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

// 单个驾驶员的G1验证结果
export interface SingleDriverG1Result {
  // 驾驶员识别信息
  driver_name: string;
  mvr_licence_number: string | null;
  quote_licence_number: string | null;
  match_status: 'exact_match' | 'partial_match' | 'no_match' | 'no_quote_data';
  
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
  
  // 该驾驶员的验证状态
  driver_status: RuleStatus;
  driver_recommendation: string;
  driver_details: string;
}

// 多驾驶员G1验证结果
export interface MultiDriverG1Result {
  drivers: SingleDriverG1Result[];
  summary: {
    total_drivers: number;
    matched_drivers: number;
    passed_validations: number;
    failed_validations: number;
    requires_review: number;
    insufficient_data: number;
  };
  overall_status: RuleStatus;
}

// G1起始日期验证结果 - 保持向后兼容
export interface G1StartDateResult {
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
}

// 单车辆年龄验证结果
export interface SingleVehicleAgeResult {
  vehicle_id: string;
  vehicle_info?: string;
  vehicle_year: string | null;
  vehicle_age: number | null;
  coverage_details?: {
    comprehensive: boolean;
    collision: boolean;
    all_perils: boolean;
  };
  status: 'passed' | 'requires_review';
  recommendation: string;
}

// 车辆年龄与保险覆盖验证结果
export interface VehicleAgeResult {
  // 向后兼容字段
  vehicle_year?: string | null;
  vehicle_age?: number | null;
  coverage_details?: {
    comprehensive?: boolean;
    collision?: boolean;
    all_perils?: boolean;
  };
  
  // 多车辆字段
  vehicles?: SingleVehicleAgeResult[];
  total_vehicles?: number;
  requires_review_vehicles?: number;
}

export interface BusinessRuleResult {
  id: string;
  name: string;
  status: RuleStatus;
  result?: AnnualMileageResult | NewDriverResult | G1StartDateResult | MultiDriverG1Result | VehicleAgeResult | Record<string, unknown>; // 推算的结果值
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