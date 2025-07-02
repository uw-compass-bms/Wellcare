import React from 'react';

// 基础文档数据接口
export interface BaseDocumentData {
  name: string | null;
  licence_number: string | null;
  date_of_birth: string | null;
  address: string | null;
}

// MVR数据类型
export interface MvrData extends BaseDocumentData {
  gender: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  class: string | null;
  status: string | null;
  conditions: Array<{ date: string | null; description: string }> | null;
  convictions: Array<{ date: string | null; description: string }> | null;
}

// Auto+数据类型
export interface AutoPlusData extends BaseDocumentData {
  first_insurance_date: string | null;
  policies: Array<{ policy_period: string; company: string; status: string }> | null;
  claims: Array<{
    claim_number: string;
    date_of_loss: string;
    at_fault: boolean;
    total_claim_amount: string;
    coverage_types: string | null;
  }> | null;
}

// Quote数据类型
export interface QuoteData extends BaseDocumentData {
  // 驾照相关信息
  gender: string | null;
  licence_class: string | null;
  date_g: string | null;
  date_g2: string | null;
  date_g1: string | null;
  date_insured: string | null;
  date_with_company: string | null;
  
  // 车辆信息
  vin: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  garaging_location: string | null;
  leased: boolean | null;
  
  // 客户联系信息
  customer_contact_info: {
    full_address: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  
  // 理赔记录
  claims: Array<{
    description: string;
    date: string;
    at_fault: boolean;
    vehicle_involved: string;
    tp_pd: string | null;
    ab: string | null;
    coll: string | null;
    other_pd: string | null;
  }> | null;
  
  // 违规记录
  convictions: Array<{
    description: string;
    date: string;
    severity: string;
  }> | null;
  
  // 保险中断记录
  lapses: Array<{
    description: string;
    start_date: string;
    end_date: string;
    duration_months: number;
  }> | null;
}

// Application数据类型 - 根据Ontario汽车保险申请表提取规则定义
export interface ApplicationData extends BaseDocumentData {
  // 基本申请信息
  phone: string | null;
  lessor_info: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  
  // 车辆信息
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vin: string | null;
  lienholder_info: string | null;
  vehicle_ownership: 'lease' | 'owned' | null; // 判断是lease还是owned
  
  // 使用信息
  estimated_annual_driving_distance: string | null;
  commute_distance: string | null; // 通勤单程距离
  automobile_use_details: string | null;
  
  // 驾驶员信息
  drivers: Array<{
    name: string;
    licence_number: string;
    date_of_birth: string;
    gender: string | null;
    marital_status: string | null;
    first_licensed_date: string | null; // 首次获得驾照日期
  }> | null;
  
  // 保险保障信息
  insurance_coverages: {
    liability_amount: string | null; // 第三者责任险金额 (1000=100万)
    property_damage_amount: string | null;
    loss_or_damage: {
      comprehensive: {
        covered: boolean;
        deductible: string | null;
        premium: string | null;
      } | null;
      collision: {
        covered: boolean;
        deductible: string | null;
        premium: string | null;
      } | null;
      all_perils: {
        covered: boolean;
        deductible: string | null;
        premium: string | null;
      } | null;
    } | null;
  } | null;
  
  // 附加条款 Policy Change Forms
  policy_change_forms: {
    loss_of_use: string | null; // #20
    liab_to_unowned_veh: string | null; // #27
    limited_waiver: string | null; // #43a
    rent_or_lease: string | null; // #5a
    accident_waiver: string | null;
    minor_conviction_protection: string | null;
  } | null;
  
  // 备注信息
  remarks: string | null;
  
  // 支付信息
  payment_info: {
    annual_premium: string | null; // Total Estimated Cost
    monthly_payment: string | null; // Amount of Each Instalment
    has_interest: boolean | null; // 是否有利息
    payment_type: 'annual' | 'monthly' | null; // 根据利息判断支付方式
  } | null;
  
  // 签名确认
  signatures: {
    applicant_signed: boolean | null;
    applicant_signature_date: string | null;
    broker_signed: boolean | null;
    broker_signature_date: string | null;
  } | null;
}

// 文档类型枚举
export type DocumentType = 'mvr' | 'autoplus' | 'quote' | 'application';

// 联合数据类型
export type DocumentData = MvrData | AutoPlusData | QuoteData | ApplicationData;

// 已删除验证错误类型 - 不再需要

// 文件缓存类型
export interface CachedFile {
  file: File;
  fileName: string;
  fileSize: number;
  fileType: string;
  b64data: string;
}

// 文档状态类型
export interface DocumentState {
  data: DocumentData | null;
  loading: boolean;
  error: string | null;
  uploaded: boolean;
  cached: boolean; // 是否已缓存文件但未处理
  cachedFile: CachedFile | null; // 缓存的文件数据
}

// 文档配置类型
export interface DocumentConfig {
  type: DocumentType;
  title: string;
  description: string;
  icon: React.ComponentType<{className?: string}>; // Lucide React图标类型
  color: string;
  bgColor: string;
  borderColor: string;
  apiEndpoint: string;
} 