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

// Application数据类型
export interface ApplicationData extends BaseDocumentData {
  application_number: string | null;
  vehicle_info: string | null;
  coverage_requested: string | null;
  requested_coverage_amount: string | null;
  intended_use: string | null;
  driving_history: string | null;
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