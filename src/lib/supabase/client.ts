import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { MvrData } from '@/app/app/document-verification/types'

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
  user_id: string
  condition_date: string | null
  description: string
  created_at: string
  updated_at: string
}

export interface MVRConviction {
  id: string
  mvr_record_id: string
  user_id: string
  conviction_date: string | null
  description: string
  created_at: string
  updated_at: string
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
        user_id: userId,
        condition_date: condition.date,
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
        user_id: userId,
        conviction_date: conviction.date,
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

// 默认导出
export default supabase 