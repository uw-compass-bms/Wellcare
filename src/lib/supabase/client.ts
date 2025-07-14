import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { MvrData, AutoPlusData, QuoteData, ApplicationData, DocumentData } from '@/app/app/document-verification/types'

// 环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 主要客户端
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey)

// 管理员客户端
export const supabaseAdmin = supabaseServiceKey 
  ? createSupabaseClient(supabaseUrl, supabaseServiceKey)
  : null

// CRM 类型定义
export interface CRMClient {
  id: string
  user_id: string
  name: string
  birthday: string
  driver_license_number: string
  created_at: string
  updated_at: string
}

// MVR 数据库类型定义
export interface MVRRecord {
  id: string
  user_id: string
  name: string | null
  licence_number: string | null
  date_of_birth: string | null
  address: string | null
  gender: string | null
  issue_date: string | null
  expiry_date: string | null
  class: string | null
  status: string | null
  file_name: string | null
  file_id: string | null
  created_at: string
  updated_at: string
  conditions?: MVRCondition[]
  convictions?: MVRConviction[]
}

export interface MVRCondition {
  id: string
  mvr_record_id: string
  date: string | null
  description: string
  created_at: string
  updated_at: string
}

export interface MVRConviction {
  id: string
  mvr_record_id: string
  date: string | null
  description: string
  created_at: string
  updated_at: string
}

// Cases 相关类型定义
export interface CaseRecord {
  id: string;
  case_number: string;
  user_id: string;
  primary_contact_name: string | null;
  primary_licence_number: string | null;
  created_at: string;
  updated_at: string;
  mvr_count: number;
  autoplus_count: number;
  quote_count: number;
  application_count: number;
  status: string;
}

export interface QuoteRecord {
  id: string;
  user_id: string;
  case_id: string;
  name: string | null;
  licence_number: string | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
  vehicles?: QuoteVehicle[];
}

export interface QuoteVehicle {
  id: string;
  vin: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  annual_km: string | null;
  garaging_location: string | null;
  drivers?: QuoteDriver[];
}

export interface QuoteDriver {
  id: string;
  name: string;
  role: string;
  licence_number: string | null;
  birth_date: string | null;
}

export interface AutoPlusRecord {
  id: string;
  user_id: string;
  case_id: string;
  name: string | null;
  licence_number: string | null;
  first_insurance_date: string | null;
  created_at: string;
  updated_at: string;
  policies?: AutoPlusPolicy[];
  claims?: AutoPlusClaim[];
}

export interface AutoPlusPolicy {
  id: string;
  policy_period: string;
  company: string;
  status: string;
}

export interface AutoPlusClaim {
  id: string;
  claim_number: string;
  date_of_loss: string;
  at_fault: boolean;
  total_claim_amount: string;
}

export interface ApplicationRecord {
  id: string;
  user_id: string;
  case_id: string;
  name: string | null;
  licence_number: string | null;
  phone: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  vehicles?: ApplicationVehicle[];
  drivers?: ApplicationDriver[];
}

export interface ApplicationVehicle {
  id: string;
  vin: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  annual_mileage: string | null;
  vehicle_ownership: string | null;
}

export interface ApplicationDriver {
  id: string;
  name: string;
  licence_number: string;
  date_of_birth: string;
}

// 搜索参数类型
export interface CaseSearchParams {
  case_number?: string;
  primary_contact_name?: string;
  date_from?: string;
  date_to?: string;
}

// 获取用户的客户列表
export async function getClients(userId: string): Promise<CRMClient[]> {
  console.log('📥 Getting clients for user:', userId)
  
  const { data, error } = await supabase
    .from('crm_clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error getting clients:', error)
    throw new Error(`Failed to get clients: ${error.message}`)
  }

  return data || []
}

// 创建客户记录
export async function createClient(clientData: Omit<CRMClient, 'id' | 'created_at' | 'updated_at'>): Promise<CRMClient> {
  console.log('📝 Creating client for user:', clientData.user_id)
  
  const { data, error } = await supabase
    .from('crm_clients')
    .insert([clientData])
    .select()
    .single()

  if (error) {
    console.error('❌ Error creating client:', error)
    throw new Error(`Failed to create client: ${error.message}`)
  }

  return data
}

// 更新客户记录
export async function updateClient(id: string, updates: Partial<CRMClient>): Promise<CRMClient> {
  console.log('🔄 Updating client:', id)
  
  const { data, error } = await supabase
    .from('crm_clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('❌ Error updating client:', error)
    throw new Error(`Failed to update client: ${error.message}`)
  }

  return data
}

// 删除客户记录
export async function deleteClient(id: string): Promise<boolean> {
  console.log('🗑️ Deleting client:', id)
  
  const { error } = await supabase
    .from('crm_clients')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('❌ Error deleting client:', error)
    throw new Error(`Failed to delete client: ${error.message}`)
  }

  return true
}

// ========== MVR 数据操作函数 ==========

// 保存 MVR 数据 (从 document-verification 提取后调用)
export async function saveMVRData(userId: string, mvrData: MvrData): Promise<MVRRecord> {
  console.log('📝 Saving MVR data for user:', userId)
  
  try {
    // 1. 插入主记录
    const mainRecord = {
      user_id: userId,
      name: mvrData.name,
      licence_number: mvrData.licence_number,
      date_of_birth: mvrData.date_of_birth,
      address: mvrData.address,
      gender: mvrData.gender,
      issue_date: mvrData.issue_date,
      expiry_date: mvrData.expiry_date,
      class: mvrData.class,
      status: mvrData.status,
      file_name: mvrData.file_name,
      file_id: mvrData.file_id
    }

    const { data: mvrRecord, error: mainError } = await supabase
      .from('mvr_records')
      .insert([mainRecord])
      .select()
      .single()

    if (mainError) {
      console.error('❌ Error creating MVR record:', mainError)
      throw new Error(`Failed to create MVR record: ${mainError.message}`)
    }

    // 2. 插入违规条件
    if (mvrData.conditions && mvrData.conditions.length > 0) {
      const conditions = mvrData.conditions.map(condition => ({
        mvr_record_id: mvrRecord.id,
        date: condition.date,
        description: condition.description
      }))

      const { error: conditionsError } = await supabase
        .from('mvr_conditions')
        .insert(conditions)

      if (conditionsError) {
        console.error('❌ Error creating MVR conditions:', conditionsError)
        throw new Error(`Failed to create MVR conditions: ${conditionsError.message}`)
      }
    }

    // 3. 插入定罪记录
    if (mvrData.convictions && mvrData.convictions.length > 0) {
      const convictions = mvrData.convictions.map(conviction => ({
        mvr_record_id: mvrRecord.id,
        date: conviction.date,
        description: conviction.description
      }))

      const { error: convictionsError } = await supabase
        .from('mvr_convictions')
        .insert(convictions)

      if (convictionsError) {
        console.error('❌ Error creating MVR convictions:', convictionsError)
        throw new Error(`Failed to create MVR convictions: ${convictionsError.message}`)
      }
    }

    console.log('✅ MVR data saved successfully:', mvrRecord.id)
    return mvrRecord
  } catch (err) {
    console.error('❌ Failed to save MVR data:', err)
    throw err
  }
}

// 批量保存 MVR 数据 (多文件提取)
export async function saveMVRDataBatch(userId: string, mvrDataArray: MvrData[]): Promise<MVRRecord[]> {
  console.log('📝 Saving batch MVR data for user:', userId, 'Count:', mvrDataArray.length)
  
  const results: MVRRecord[] = []
  
  for (const mvrData of mvrDataArray) {
    try {
      const result = await saveMVRData(userId, mvrData)
      results.push(result)
      // 添加小延迟避免数据库压力
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (err) {
      console.error('❌ Failed to save MVR data in batch:', err)
      // 继续处理其他记录，不中断整个批处理
    }
  }
  
  console.log('✅ Batch MVR data saved. Success count:', results.length)
  return results
}

// 获取用户的 MVR 记录 (包含子记录)
export async function getMVRRecords(userId: string): Promise<MVRRecord[]> {
  console.log('📥 Getting MVR records for user:', userId)
  
  const { data: records, error: recordsError } = await supabase
    .from('mvr_records')
    .select(`
      *,
      conditions:mvr_conditions(*),
      convictions:mvr_convictions(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (recordsError) {
    console.error('❌ Error getting MVR records:', recordsError)
    throw new Error(`Failed to get MVR records: ${recordsError.message}`)
  }

  return records || []
}

// 获取单个 MVR 记录
export async function getMVRRecord(recordId: string): Promise<MVRRecord | null> {
  console.log('📥 Getting MVR record:', recordId)
  
  const { data: record, error } = await supabase
    .from('mvr_records')
    .select(`
      *,
      conditions:mvr_conditions(*),
      convictions:mvr_convictions(*)
    `)
    .eq('id', recordId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('❌ Error getting MVR record:', error)
    throw new Error(`Failed to get MVR record: ${error.message}`)
  }

  return record
}

// 删除 MVR 记录 (级联删除子记录)
export async function deleteMVRRecord(recordId: string): Promise<boolean> {
  console.log('🗑️ Deleting MVR record:', recordId)
  
  const { error } = await supabase
    .from('mvr_records')
    .delete()
    .eq('id', recordId)

  if (error) {
    console.error('❌ Error deleting MVR record:', error)
    throw new Error(`Failed to delete MVR record: ${error.message}`)
  }

  return true
}

// 更新 MVR 记录基础信息
export async function updateMVRRecord(recordId: string, updates: Partial<MVRRecord>): Promise<MVRRecord> {
  console.log('🔄 Updating MVR record:', recordId)
  
  const { data: record, error } = await supabase
    .from('mvr_records')
    .update(updates)
    .eq('id', recordId)
    .select()
    .single()

  if (error) {
    console.error('❌ Error updating MVR record:', error)
    throw new Error(`Failed to update MVR record: ${error.message}`)
  }

  return record
}

// Cases 数据库操作函数
export const getCases = async (userId: string, searchParams?: CaseSearchParams): Promise<CaseRecord[]> => {
  let query = supabase
    .from('cases')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  // 添加搜索条件
  if (searchParams?.case_number) {
    query = query.ilike('case_number', `%${searchParams.case_number}%`);
  }
  
  if (searchParams?.primary_contact_name) {
    query = query.ilike('primary_contact_name', `%${searchParams.primary_contact_name}%`);
  }
  
  if (searchParams?.date_from) {
    query = query.gte('created_at', searchParams.date_from);
  }
  
  if (searchParams?.date_to) {
    query = query.lte('created_at', searchParams.date_to);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching cases:', error);
    throw error;
  }
  
  return data || [];
};

export const getCaseById = async (caseId: string): Promise<CaseRecord | null> => {
  const { data, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .single();
  
  if (error) {
    console.error('Error fetching case:', error);
    throw error;
  }
  
  return data;
};

export const createCase = async (
  userId: string,
  primaryContactName: string | null,
  primaryLicenceNumber: string | null
): Promise<CaseRecord> => {
  // 生成 case number
  const { data: caseNumberData, error: caseNumberError } = await supabase
    .rpc('generate_case_number');
  
  if (caseNumberError) {
    console.error('Error generating case number:', caseNumberError);
    throw caseNumberError;
  }
  
  const { data, error } = await supabase
    .from('cases')
    .insert({
      case_number: caseNumberData,
      user_id: userId,
      primary_contact_name: primaryContactName,
      primary_licence_number: primaryLicenceNumber,
      status: 'active'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating case:', error);
    throw error;
  }
  
  return data;
};

export const updateCaseDocumentCount = async (
  caseId: string,
  documentType: 'mvr' | 'autoplus' | 'quote' | 'application',
  increment: number = 1
): Promise<void> => {
  // 由于我们有触发器自动处理计数，这个函数实际上不需要手动更新
  // 触发器会在插入/删除文档记录时自动更新计数
  console.log(`Document count for ${documentType} will be updated automatically by triggers for case ${caseId} with increment ${increment}`);
};

// 修改现有的 saveMVRData 函数，添加 case_id 参数
export const saveMVRDataWithCase = async (
  userId: string,
  caseId: string,
  mvrData: MvrData
): Promise<string> => {
  const { data, error } = await supabase
    .from('mvr_records')
    .insert({
      user_id: userId,
      case_id: caseId,
      name: mvrData.name,
      licence_number: mvrData.licence_number,
      date_of_birth: mvrData.date_of_birth,
      address: mvrData.address,
      gender: mvrData.gender,
      issue_date: mvrData.issue_date,
      expiry_date: mvrData.expiry_date,
      class: mvrData.class,
      status: mvrData.status,
      file_name: mvrData.file_name
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving MVR data:', error);
    throw error;
  }

  // 保存 conditions
  if (mvrData.conditions && mvrData.conditions.length > 0) {
    const conditionsData = mvrData.conditions.map(condition => ({
      mvr_record_id: data.id,
      date: condition.date,
      description: condition.description
    }));

    const { error: conditionsError } = await supabase
      .from('mvr_conditions')
      .insert(conditionsData);

    if (conditionsError) {
      console.error('Error saving MVR conditions:', conditionsError);
      throw conditionsError;
    }
  }

  // 保存 convictions
  if (mvrData.convictions && mvrData.convictions.length > 0) {
    const convictionsData = mvrData.convictions.map(conviction => ({
      mvr_record_id: data.id,
      date: conviction.date,
      description: conviction.description
    }));

    const { error: convictionsError } = await supabase
      .from('mvr_convictions')
      .insert(convictionsData);

    if (convictionsError) {
      console.error('Error saving MVR convictions:', convictionsError);
      throw convictionsError;
    }
  }

  return data.id;
};

// 批量保存 MVR 数据到指定 case
export const saveMVRDataBatchWithCase = async (
  userId: string,
  caseId: string,
  mvrDataArray: MvrData[]
): Promise<void> => {
  for (const mvrData of mvrDataArray) {
    await saveMVRDataWithCase(userId, caseId, mvrData);
  }
  
  // 更新 case 的 MVR 计数
  await updateCaseDocumentCount(caseId, 'mvr', mvrDataArray.length);
};

// 获取 case 相关的 MVR 记录
export const getMVRRecordsByCase = async (caseId: string): Promise<MVRRecord[]> => {
  const { data, error } = await supabase
    .from('mvr_records')
    .select(`
      *,
      conditions:mvr_conditions(*),
      convictions:mvr_convictions(*)
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching MVR records by case:', error);
    throw error;
  }

  return data || [];
};

// 获取 case 相关的 Quote 记录
export const getQuoteRecordsByCase = async (caseId: string): Promise<QuoteRecord[]> => {
  const { data, error } = await supabase
    .from('quote_records')
    .select(`
      *,
      vehicles:quote_vehicles(
        *,
        drivers:quote_drivers(
          *,
          claims:quote_claims(*),
          lapses:quote_lapses(*),
          convictions:quote_convictions(*)
        )
      )
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching Quote records by case:', error);
    throw error;
  }

  return data || [];
};

// 获取 case 相关的 Auto+ 记录
export const getAutoPlusRecordsByCase = async (caseId: string): Promise<AutoPlusRecord[]> => {
  const { data, error } = await supabase
    .from('autoplus_records')
    .select(`
      *,
      policies:autoplus_policies(*),
      claims:autoplus_claims(*)
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching Auto+ records by case:', error);
    throw error;
  }

  return data || [];
};

// 获取 case 相关的 Application 记录
export const getApplicationRecordsByCase = async (caseId: string): Promise<ApplicationRecord[]> => {
  const { data, error } = await supabase
    .from('application_records')
    .select(`
      *,
      vehicles:application_vehicles(*),
      drivers:application_drivers(*)
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching Application records by case:', error);
    throw error;
  }

  return data || [];
};

// ========== AUTO+ 数据操作函数 ==========

// 保存单个Auto+记录
export const saveAutoPlusDataWithCase = async (
  userId: string,
  caseId: string,
  autoPlusData: AutoPlusData
): Promise<string> => {
  const { data, error } = await supabase
    .from('autoplus_records')
    .insert({
      user_id: userId,
      case_id: caseId,
      name: autoPlusData.name,
      licence_number: autoPlusData.licence_number,
      date_of_birth: autoPlusData.date_of_birth,
      address: autoPlusData.address,
      first_insurance_date: autoPlusData.first_insurance_date,
      file_name: autoPlusData.file_name,
      file_id: autoPlusData.file_id
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving Auto+ data:', error);
    throw error;
  }

  // 保存保单历史
  if (autoPlusData.policies && autoPlusData.policies.length > 0) {
    const policiesData = autoPlusData.policies.map(policy => ({
      autoplus_record_id: data.id,
      user_id: userId,
      policy_period: policy.policy_period,
      company: policy.company,
      status: policy.status
    }));

    const { error: policiesError } = await supabase
      .from('autoplus_policies')
      .insert(policiesData);

    if (policiesError) {
      console.error('Error saving Auto+ policies:', policiesError);
      throw policiesError;
    }
  }

  // 保存理赔记录
  if (autoPlusData.claims && autoPlusData.claims.length > 0) {
    const claimsData = autoPlusData.claims.map(claim => ({
      autoplus_record_id: data.id,
      user_id: userId,
      claim_number: claim.claim_number,
      date_of_loss: claim.date_of_loss,
      at_fault: claim.at_fault,
      total_claim_amount: claim.total_claim_amount,
      coverage_types: claim.coverage_types
    }));

    const { error: claimsError } = await supabase
      .from('autoplus_claims')
      .insert(claimsData);

    if (claimsError) {
      console.error('Error saving Auto+ claims:', claimsError);
      throw claimsError;
    }
  }

  return data.id;
};

// 批量保存Auto+记录
export const saveAutoPlusDataBatchWithCase = async (
  userId: string,
  caseId: string,
  autoPlusDataArray: AutoPlusData[]
): Promise<void> => {
  for (const autoPlusData of autoPlusDataArray) {
    await saveAutoPlusDataWithCase(userId, caseId, autoPlusData);
  }
};

// ========== QUOTE 数据操作函数 ==========

// 保存Quote记录
export const saveQuoteDataWithCase = async (
  userId: string,
  caseId: string,
  quoteData: QuoteData
): Promise<string> => {
  const { data, error } = await supabase
    .from('quote_records')
    .insert({
      user_id: userId,
      case_id: caseId,
      name: quoteData.name,
      licence_number: quoteData.licence_number,
      date_of_birth: quoteData.date_of_birth,
      address: quoteData.address,
      gender: quoteData.gender,
      licence_class: quoteData.licence_class,
      date_g: quoteData.date_g,
      date_g2: quoteData.date_g2,
      date_g1: quoteData.date_g1,
      date_insured: quoteData.date_insured,
      date_with_company: quoteData.date_with_company,
      vin: quoteData.vin,
      vehicle_year: quoteData.vehicle_year,
      vehicle_make: quoteData.vehicle_make,
      vehicle_model: quoteData.vehicle_model,
      garaging_location: quoteData.garaging_location,
      leased: quoteData.leased,
      annual_mileage: quoteData.annual_mileage,
      commute_distance: quoteData.commute_distance,
      customer_contact_info_address: quoteData.customer_contact_info?.full_address,
      customer_contact_info_email: quoteData.customer_contact_info?.email,
      customer_contact_info_phone: quoteData.customer_contact_info?.phone,
      driver_limit_notice: quoteData.driver_limit_notice,
      file_name: 'quote_file',
      file_id: 'quote_file_id'
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving Quote data:', error);
    throw error;
  }

  // 保存车辆信息
  if (quoteData.vehicles && quoteData.vehicles.length > 0) {
    for (const vehicle of quoteData.vehicles) {
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('quote_vehicles')
        .insert({
          quote_record_id: data.id,
          user_id: userId,
          vehicle_id: vehicle.vehicle_id,
          vehicle_type: vehicle.vehicle_type,
          vin: vehicle.vin,
          vehicle_year: vehicle.vehicle_year,
          vehicle_make: vehicle.vehicle_make,
          vehicle_model: vehicle.vehicle_model,
          garaging_location: vehicle.garaging_location,
          leased: vehicle.leased,
          annual_km: vehicle.annual_km,
          business_km: vehicle.business_km,
          daily_km: vehicle.daily_km,
          purchase_condition: vehicle.purchase_condition,
          purchase_date: vehicle.purchase_date,
          km_at_purchase: vehicle.km_at_purchase,
          list_price_new: vehicle.list_price_new,
          purchase_price: vehicle.purchase_price,
          winter_tires: vehicle.winter_tires,
          parking_at_night: vehicle.parking_at_night,
          // 防盗设备
          anti_theft_device_type: vehicle.anti_theft?.device_type,
          anti_theft_manufacturer: vehicle.anti_theft?.manufacturer,
          anti_theft_engraving: vehicle.anti_theft?.engraving,
          // 保险保障
          bodily_injury_covered: vehicle.coverages?.bodily_injury?.covered,
          bodily_injury_amount: vehicle.coverages?.bodily_injury?.amount,
          direct_compensation_covered: vehicle.coverages?.direct_compensation?.covered,
          direct_compensation_deductible: vehicle.coverages?.direct_compensation?.deductible,
          accident_benefits_covered: vehicle.coverages?.accident_benefits?.covered,
          accident_benefits_type: vehicle.coverages?.accident_benefits?.type,
          uninsured_automobile_covered: vehicle.coverages?.uninsured_automobile?.covered,
          loss_or_damage_comprehensive_covered: vehicle.coverages?.loss_or_damage?.comprehensive?.covered,
          loss_or_damage_comprehensive_deductible: vehicle.coverages?.loss_or_damage?.comprehensive?.deductible,
          loss_or_damage_collision_covered: vehicle.coverages?.loss_or_damage?.collision?.covered,
          loss_or_damage_collision_deductible: vehicle.coverages?.loss_or_damage?.collision?.deductible,
          loss_or_damage_all_perils_covered: vehicle.coverages?.loss_or_damage?.all_perils?.covered,
          loss_or_damage_all_perils_deductible: vehicle.coverages?.loss_or_damage?.all_perils?.deductible,
          // 附加条款
          endorsements_rent_or_lease: vehicle.coverages?.endorsements?.rent_or_lease,
          endorsements_loss_of_use_covered: vehicle.coverages?.endorsements?.loss_of_use?.covered,
          endorsements_loss_of_use_amount: vehicle.coverages?.endorsements?.loss_of_use?.amount,
          endorsements_liab_to_unowned_veh_covered: vehicle.coverages?.endorsements?.liab_to_unowned_veh?.covered,
          endorsements_liab_to_unowned_veh_amount: vehicle.coverages?.endorsements?.liab_to_unowned_veh?.amount,
          endorsements_replacement_cost: vehicle.coverages?.endorsements?.replacement_cost,
          endorsements_family_protection_covered: vehicle.coverages?.endorsements?.family_protection?.covered,
          endorsements_family_protection_amount: vehicle.coverages?.endorsements?.family_protection?.amount,
          endorsements_accident_waiver: vehicle.coverages?.endorsements?.accident_waiver,
          endorsements_minor_conviction_protection: vehicle.coverages?.endorsements?.minor_conviction_protection
        })
        .select('id')
        .single();

      if (vehicleError) {
        console.error('Error saving Quote vehicle:', vehicleError);
        throw vehicleError;
      }

      // 保存该车辆的驾驶员信息
      if (vehicle.drivers && vehicle.drivers.length > 0) {
        for (const driver of vehicle.drivers) {
          const { data: driverData, error: driverError } = await supabase
            .from('quote_drivers')
            .insert({
              quote_record_id: data.id,
              quote_vehicle_id: vehicleData.id,
              user_id: userId,
              name: driver.name,
              role: driver.role,
              birth_date: driver.birth_date,
              marital_status: driver.marital_status,
              gender: driver.gender,
              relationship_to_applicant: driver.relationship_to_applicant,
              licence_number: driver.licence_number,
              licence_province: driver.licence_province,
              occupation: driver.occupation,
              licence_class: driver.licence_class,
              date_g: driver.date_g,
              date_g2: driver.date_g2,
              date_g1: driver.date_g1,
              date_insured: driver.date_insured,
              current_carrier: driver.current_carrier,
              date_with_company: driver.date_with_company
            })
            .select('id')
            .single();

          if (driverError) {
            console.error('Error saving Quote driver:', driverError);
            throw driverError;
          }

          // 保存驾驶员的理赔记录
          if (driver.claims && driver.claims.length > 0) {
            const claimsData = driver.claims.map(claim => ({
              quote_driver_id: driverData.id,
              user_id: userId,
              description: claim.description,
              claim_date: claim.date,
              at_fault: claim.at_fault,
              vehicle_involved: claim.vehicle_involved,
              tp_bi: claim.tp_bi,
              tp_pd: claim.tp_pd,
              ab: claim.ab,
              coll: claim.coll,
              other_pd: claim.other_pd,
              vehicle_mismatch: claim.vehicle_mismatch
            }));

            const { error: claimsError } = await supabase
              .from('quote_claims')
              .insert(claimsData);

            if (claimsError) {
              console.error('Error saving Quote claims:', claimsError);
              throw claimsError;
            }
          }

          // 保存驾驶员的间断记录
          if (driver.lapses && driver.lapses.length > 0) {
            const lapsesData = driver.lapses.map(lapse => ({
              quote_driver_id: driverData.id,
              user_id: userId,
              description: lapse.description,
              lapse_date: lapse.date,
              duration_months: lapse.duration_months,
              re_instate_date: lapse.re_instate_date
            }));

            const { error: lapsesError } = await supabase
              .from('quote_lapses')
              .insert(lapsesData);

            if (lapsesError) {
              console.error('Error saving Quote lapses:', lapsesError);
              throw lapsesError;
            }
          }

          // 保存驾驶员的违法记录
          if (driver.convictions && driver.convictions.length > 0) {
            const convictionsData = driver.convictions.map(conviction => ({
              quote_driver_id: driverData.id,
              user_id: userId,
              description: conviction.description,
              conviction_date: conviction.date,
              kmh: conviction.kmh,
              severity: conviction.severity
            }));

            const { error: convictionsError } = await supabase
              .from('quote_convictions')
              .insert(convictionsData);

            if (convictionsError) {
              console.error('Error saving Quote convictions:', convictionsError);
              throw convictionsError;
            }
          }
        }
      }
    }
  }

  return data.id;
};

// ========== APPLICATION 数据操作函数 ==========

// 保存Application记录
export const saveApplicationDataWithCase = async (
  userId: string,
  caseId: string,
  applicationData: ApplicationData
): Promise<string> => {
  const { data, error } = await supabase
    .from('application_records')
    .insert({
      user_id: userId,
      case_id: caseId,
      name: applicationData.name,
      licence_number: applicationData.licence_number,
      date_of_birth: applicationData.date_of_birth,
      address: applicationData.address,
      phone: applicationData.phone,
      lessor_info: applicationData.lessor_info,
      effective_date: applicationData.effective_date,
      expiry_date: applicationData.expiry_date,
      // 向后兼容字段
      vehicle_year: applicationData.vehicle_year,
      vehicle_make: applicationData.vehicle_make,
      vehicle_model: applicationData.vehicle_model,
      vin: applicationData.vin,
      lienholder_info: applicationData.lienholder_info,
      vehicle_ownership: applicationData.vehicle_ownership,
      annual_mileage: applicationData.annual_mileage,
      commute_distance: applicationData.commute_distance,
      automobile_use_details: applicationData.automobile_use_details,
      remarks: applicationData.remarks,
      // 支付信息
      payment_info_annual_premium: applicationData.payment_info?.annual_premium,
      payment_info_monthly_payment: applicationData.payment_info?.monthly_payment,
      payment_info_payment_type: applicationData.payment_info?.payment_type,
      // 签名确认
      signatures_applicant_signed: applicationData.signatures?.applicant_signed,
      signatures_applicant_signature_date: applicationData.signatures?.applicant_signature_date,
      signatures_broker_signed: applicationData.signatures?.broker_signed,
      signatures_broker_signature_date: applicationData.signatures?.broker_signature_date,
      file_name: 'application_file',
      file_id: 'application_file_id'
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving Application data:', error);
    throw error;
  }

  // 保存车辆信息
  if (applicationData.vehicles && applicationData.vehicles.length > 0) {
    for (const vehicle of applicationData.vehicles) {
      const { error: vehicleError } = await supabase
        .from('application_vehicles')
        .insert({
          application_record_id: data.id,
          user_id: userId,
          vehicle_id: vehicle.vehicle_id,
          vehicle_year: vehicle.vehicle_year,
          vehicle_make: vehicle.vehicle_make,
          vehicle_model: vehicle.vehicle_model,
          vin: vehicle.vin,
          lienholder_info: vehicle.lienholder_info,
          vehicle_ownership: vehicle.vehicle_ownership,
          annual_mileage: vehicle.annual_mileage,
          commute_distance: vehicle.commute_distance,
          automobile_use_details: vehicle.automobile_use_details,
          total_premium: vehicle.coverages?.total_premium
        });

      if (vehicleError) {
        console.error('Error saving Application vehicle:', vehicleError);
        throw vehicleError;
      }
    }
  }

  // 保存驾驶员信息
  if (applicationData.drivers && applicationData.drivers.length > 0) {
    const driversData = applicationData.drivers.map(driver => ({
      application_record_id: data.id,
      user_id: userId,
      name: driver.name,
      licence_number: driver.licence_number,
      date_of_birth: driver.date_of_birth,
      gender: driver.gender,
      marital_status: driver.marital_status,
      first_licensed_date: driver.first_licensed_date
    }));

    const { error: driversError } = await supabase
      .from('application_drivers')
      .insert(driversData);

    if (driversError) {
      console.error('Error saving Application drivers:', driversError);
      throw driversError;
    }
  }

  return data.id;
};

// ========== CASE 文档更新功能 ==========

// 删除指定Case的特定文档类型数据
export const deleteDocumentsByCase = async (
  caseId: string,
  documentType: 'mvr' | 'autoplus' | 'quote' | 'application'
): Promise<void> => {
  const tableMap = {
    mvr: 'mvr_records',
    autoplus: 'autoplus_records', 
    quote: 'quote_records',
    application: 'application_records'
  };

  const { error } = await supabase
    .from(tableMap[documentType])
    .delete()
    .eq('case_id', caseId);

  if (error) {
    console.error(`Error deleting ${documentType} documents:`, error);
    throw error;
  }

  console.log(`✅ Deleted all ${documentType} documents for case ${caseId}`);
};

// 更新Case中的文档数据（先删除再插入）
export const updateCaseDocuments = async (
  caseId: string,
  documentType: 'mvr' | 'autoplus' | 'quote' | 'application',
  newData: DocumentData | DocumentData[]
): Promise<void> => {
  console.log(`🔄 Updating ${documentType} documents for case ${caseId}`);
  
  // 先删除现有数据
  await deleteDocumentsByCase(caseId, documentType);
  
  // 获取Case信息（用于获取user_id）
  const caseRecord = await getCaseById(caseId);
  if (!caseRecord) {
    throw new Error('Case not found');
  }

  // 根据文档类型插入新数据
  switch (documentType) {
    case 'mvr':
      if (Array.isArray(newData)) {
        await saveMVRDataBatchWithCase(caseRecord.user_id, caseId, newData as MvrData[]);
      } else {
        await saveMVRDataWithCase(caseRecord.user_id, caseId, newData as MvrData);
      }
      break;
      
    case 'autoplus':
      if (Array.isArray(newData)) {
        await saveAutoPlusDataBatchWithCase(caseRecord.user_id, caseId, newData as AutoPlusData[]);
      } else {
        await saveAutoPlusDataWithCase(caseRecord.user_id, caseId, newData as AutoPlusData);
      }
      break;
      
    case 'quote':
      await saveQuoteDataWithCase(caseRecord.user_id, caseId, newData as QuoteData);
      break;
      
    case 'application':
      await saveApplicationDataWithCase(caseRecord.user_id, caseId, newData as ApplicationData);
      break;
  }

  console.log(`✅ Successfully updated ${documentType} documents for case ${caseId}`);
};

// 获取Case的详细信息（包含所有文档统计）
export const getCaseDetails = async (caseId: string) => {
  const { data, error } = await supabase
    .from('cases')
    .select(`
      *,
      mvr_records(count),
      autoplus_records(count),
      quote_records(count),
      application_records(count)
    `)
    .eq('id', caseId)
    .single();

  if (error) {
    console.error('Error fetching case details:', error);
    throw error;
  }

  return data;
};

// 默认导出
export default supabase 