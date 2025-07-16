/**
 * Step 4.2: 基础Token验证工具 (极简版 - 固定30天过期)
 * 封装数据库token验证函数，提供应用层接口
 */

import { supabase } from '@/lib/supabase/client'

// Token验证结果类型
export interface TokenValidationResult {
  valid: boolean
  expired?: boolean
  recipient?: {
    id: string
    name: string
    email: string
    taskId: string
    status: string
  }
  error?: string
}

/**
 * 验证收件人token
 * 基础功能：检查token是否存在且未过期
 */
export async function validateRecipientToken(token: string): Promise<TokenValidationResult> {
  try {
    if (!token || token.trim() === '') {
      return {
        valid: false,
        error: 'Token不能为空'
      }
    }

    // 使用数据库函数进行基础验证
    const { data: isValid, error: validateError } = await supabase
      .rpc('verify_recipient_token', { token_input: token })

    if (validateError) {
      return {
        valid: false,
        error: `Token验证失败: ${validateError.message}`
      }
    }

    if (!isValid) {
      // 检查token是否存在但已过期
      const { data: expiredRecipient } = await supabase
        .from('signature_recipients')
        .select('expires_at')
        .eq('token', token)
        .single()

      if (expiredRecipient) {
        return {
          valid: false,
          expired: true,
          error: 'Token已过期'
        }
      }

      return {
        valid: false,
        error: 'Token不存在'
      }
    }

    // Token有效，获取收件人信息
    const { data: recipient, error: recipientError } = await supabase
      .from('signature_recipients')
      .select('id, name, email, task_id, status')
      .eq('token', token)
      .single()

    if (recipientError || !recipient) {
      return {
        valid: false,
        error: '获取收件人信息失败'
      }
    }

    return {
      valid: true,
      recipient: {
        id: recipient.id,
        name: recipient.name,
        email: recipient.email,
        taskId: recipient.task_id,
        status: recipient.status
      }
    }

  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token验证异常'
    }
  }
}



/**
 * 简单的token格式检查
 * 检查是否符合我们的token格式: s_<16位hex>_<时间戳>
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token) return false
  
  // 基础格式检查：s_开头，包含下划线分隔
  const tokenPattern = /^s_[a-f0-9]{16}_\d+$/
  return tokenPattern.test(token)
} 