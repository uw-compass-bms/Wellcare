/**
 * 简单数据库查询函数 - Task 1.3
 * 只包含基础功能，遵循简单架构原则
 */

import { supabase } from '@/lib/supabase/client'

// 基本类型定义
export interface SignatureTask {
  id: string
  user_id: string
  title: string
  description?: string
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  sent_at?: string
  completed_at?: string
}

// 简单错误处理
export function handleDbError(error: any): string {
  return error?.message || 'Database operation failed'
}

// 测试数据库连接
export async function testDbConnection() {
  try {
    const { data, error } = await supabase
      .from('signature_tasks')
      .select('count')
      .limit(1)
    
    if (error) throw error
    return { success: true, message: 'Database connected' }
  } catch (error) {
    return { success: false, error: handleDbError(error) }
  }
}

// Phase 2 需要的基础函数

// 创建任务
export async function createTask(userId: string, title: string, description?: string) {
  try {
    const { data, error } = await supabase
      .from('signature_tasks')
      .insert({ user_id: userId, title, description })
      .select()
      .single()
    
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: handleDbError(error) }
  }
}

// 获取用户任务列表 (支持状态过滤)
export async function getTasksByUserId(userId: string, status?: string) {
  try {
    let query = supabase
      .from('signature_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: handleDbError(error) }
  }
}

// 获取单个任务
export async function getTaskById(taskId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('signature_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single()
    
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: handleDbError(error) }
  }
}

// 更新任务
export async function updateTask(taskId: string, userId: string, updates: any) {
  try {
    const { data, error } = await supabase
      .from('signature_tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: handleDbError(error) }
  }
}

// 删除任务
export async function deleteTask(taskId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('signature_tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId)
    
    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: handleDbError(error) }
  }
} 