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

// Quote多车辆多驾驶员数据类型
export interface QuoteData {
  vehicles: Array<{
    vehicle_id: string; // 车辆序号
    vehicle_type: string | null;
    vin: string | null;
    vehicle_year: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
    garaging_location: string | null;
    leased: boolean | null;
    annual_km: string | null;
    business_km: string | null;
    daily_km: string | null;
    purchase_condition: string | null;
    purchase_date: string | null;
    km_at_purchase: string | null;
    list_price_new: string | null;
    purchase_price: string | null;
    winter_tires: boolean | null;
    parking_at_night: string | null;
    anti_theft: {
      device_type: string | null;
      manufacturer: string | null;
      engraving: string | null;
    } | null;
    drivers: Array<{
      name: string;
      role: 'prn' | 'occ';
      birth_date: string | null;
      marital_status: string | null;
      gender: string | null;
      relationship_to_applicant: string | null;
      licence_number: string | null;
      licence_province: string | null;
      occupation: string | null;
      licence_class: string | null;
      date_g: string | null;
      date_g2: string | null;
      date_g1: string | null;
      date_insured: string | null;
      current_carrier: string | null;
      date_with_company: string | null;
      claims: Array<{
        description: string;
        date: string;
        at_fault: boolean;
        vehicle_involved: string;
        tp_bi: string | null;
        tp_pd: string | null;
        ab: string | null;
        coll: string | null;
        other_pd: string | null;
        vehicle_mismatch?: boolean;
      }>;
      lapses: Array<{
        description: string;
        date: string;
        duration_months: number;
        re_instate_date: string;
      }>;
      convictions: Array<{
        description: string;
        date: string;
        kmh: string | null;
        severity: string | null;
      }>;
    }>;
    // 保险保障信息 - 与Application结构保持一致以便对比
    coverages: {
      // 基础责任险
      bodily_injury: {
        covered: boolean;
        amount: string | null; // 保额
      } | null;
      direct_compensation: {
        covered: boolean;
        deductible: string | null; // 垫底费
      } | null;
      accident_benefits: {
        covered: boolean;
        type: string | null; // Standard, Enhanced等
      } | null;
      uninsured_automobile: {
        covered: boolean;
      } | null;
      
      // 车辆损失保障 - 与Application完全一致
      loss_or_damage: {
        comprehensive: {
          covered: boolean;
          deductible: string | null;
        } | null;
        collision: {
          covered: boolean;
          deductible: string | null;
        } | null;
        all_perils: {
          covered: boolean;
          deductible: string | null;
        } | null;
      } | null;
      
      // 附加条款
      endorsements: {
        rent_or_lease: boolean | null; // #5a
        loss_of_use: {
          covered: boolean;
          amount: string | null; // 保额
        } | null; // #20
        liab_to_unowned_veh: {
          covered: boolean;
          amount: string | null; // 保额
        } | null; // #27
        replacement_cost: boolean | null; // #43
        family_protection: {
          covered: boolean;
          amount: string | null; // 保额
        } | null; // #44
        accident_waiver: boolean | null;
        minor_conviction_protection: boolean | null;
      } | null;
    } | null;
  }>;
  driver_limit_notice?: string;
  
  // 向后兼容字段 - 从第一个驾驶员/车辆提取
  name?: string | null;
  licence_number?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  gender?: string | null;
  licence_class?: string | null;
  date_g?: string | null;
  date_g2?: string | null;
  date_g1?: string | null;
  date_insured?: string | null;
  date_with_company?: string | null;
  vin?: string | null;
  vehicle_year?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  garaging_location?: string | null;
  leased?: boolean | null;
  annual_mileage?: string | null;
  commute_distance?: string | null;
  customer_contact_info?: {
    full_address: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  claims?: Array<{
    description: string;
    date: string;
    at_fault: boolean;
    vehicle_involved: string;
    tp_bi: string | null;
    tp_pd: string | null;
    ab: string | null;
    coll: string | null;
    other_pd: string | null;
    vehicle_mismatch?: boolean;
  }>;
  convictions?: Array<{
    description: string;
    date: string;
    kmh: string | null;
    severity: string | null;
  }>;
  lapses?: Array<{
    description: string;
    date: string;
    duration_months: number;
    re_instate_date: string;
  }>;
}

// Application数据类型 - 根据Ontario汽车保险申请表提取规则定义
export interface ApplicationData extends BaseDocumentData {
  // 基本申请信息
  phone: string | null;
  lessor_info: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  
  // 多车辆信息
  vehicles: Array<{
    vehicle_id: string; // 车辆序号
    vehicle_year: string | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
    vin: string | null;
    lienholder_info: string | null;
    vehicle_ownership: 'lease' | 'owned' | null; // 判断是lease还是owned
    annual_mileage: string | null;
    commute_distance: string | null; // 通勤单程距离
    automobile_use_details: string | null;
    
    // 每台车的保险保障信息 - 从"Insurance Coverages Applied For"表格提取
    coverages: {
      // 基础责任险
      liability: {
        bodily_injury: {
          amount: string | null; // 保额
          premium: string | null; // 保费
        } | null;
        property_damage: {
          amount: string | null; // 保额  
          premium: string | null; // 保费
        } | null;
      } | null;
      
      // 意外福利
      accident_benefits: {
        standard: {
          amount: string | null; // 保额
          premium: string | null; // 保费
        } | null;
        enhanced: {
          income_replacement: boolean | null;
          medical_care: boolean | null;
          catastrophic_impairment: boolean | null;
          caregiver_maintenance: boolean | null;
          death_funeral: boolean | null;
          dependant_care: boolean | null;
          indexation_benefit: boolean | null;
        } | null;
      } | null;
      
      // 未保险汽车
      uninsured_automobile: {
        covered: boolean;
        amount: string | null; // 保额
        premium: string | null; // 保费
      } | null;
      
      // 直接赔偿-财产损失
      direct_compensation: {
        covered: boolean;
        deductible: string | null; // 垫底费
        premium: string | null; // 保费
      } | null;
      
      // 车辆损失保障
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
        specified_perils: {
          covered: boolean;
          deductible: string | null;
          premium: string | null;
        } | null;
      } | null;
      
      // 附加条款 Policy Change Forms
      policy_change_forms: {
        family_protection: {
          covered: boolean;
          deductible: string | null;
          premium: string | null;
        } | null;
        // 可以添加其他附加条款
      } | null;
      
      // 每台车的保费合计
      total_premium: string | null;
    } | null;
  }>;
  
  // 多驾驶员信息 - 简单列表，无复杂车辆关系
  drivers: Array<{
    name: string;
    licence_number: string;
    date_of_birth: string;
    gender: string | null;
    marital_status: string | null;
    first_licensed_date: string | null; // 首次获得驾照日期
  }>;
  
  // 备注信息 - 完整提取所有内容，包括跨页
  remarks: string | null;
  
  // 支付信息
  payment_info: {
    annual_premium: string | null; // Total Estimated Cost
    monthly_payment: string | null; // Amount of Each Instalment
    payment_type: 'annual' | 'monthly' | null; // 支付方式
  } | null;
  
  // 签名确认
  signatures: {
    applicant_signed: boolean | null;
    applicant_signature_date: string | null;
    broker_signed: boolean | null;
    broker_signature_date: string | null;
  } | null;
  
  // 向后兼容字段 - 从第一个车辆/驾驶员提取
  // name, licence_number, date_of_birth, address 继承自BaseDocumentData
  vehicle_year?: string | null;
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  vin?: string | null;
  lienholder_info?: string | null;
  vehicle_ownership?: 'lease' | 'owned' | null;
  annual_mileage?: string | null;
  commute_distance?: string | null;
  automobile_use_details?: string | null;
  
  // 向后兼容的旧结构保险保障信息
  insurance_coverages?: {
    liability_amount: string | null;
    loss_or_damage: {
      comprehensive: {
        covered: boolean;
        deductible: string | null;
      } | null;
      collision: {
        covered: boolean;
        deductible: string | null;
      } | null;
      all_perils: {
        covered: boolean;
        deductible: string | null;
        premium: string | null;
      } | null;
    } | null;
  } | null;
  
  // 向后兼容的旧结构附加条款
  policy_change_forms?: {
    loss_of_use: boolean | null;
    liab_to_unowned_veh: boolean | null;
    limited_waiver: boolean | null;
    rent_or_lease: boolean | null;
    accident_waiver: boolean | null;
    minor_conviction_protection: boolean | null;
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