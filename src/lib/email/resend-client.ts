/**
 * Task 7.1: Resend客户端配置
 * 
 * 实现基础邮件发送功能，提供统一的邮件服务接口
 * 特性：
 * - Resend API集成
 * - 环境变量验证
 * - 错误处理和重试
 * - 邮件发送状态跟踪
 */

import { Resend } from 'resend'

// 验证Resend API密钥环境变量
const RESEND_API_KEY = process.env.RESEND_API_KEY

if (!RESEND_API_KEY) {
  console.error('[Resend Client] RESEND_API_KEY environment variable is not configured')
  console.error('[Resend Client] Available env vars:', Object.keys(process.env).filter(key => key.includes('RESEND')))
}

// 创建Resend客户端实例 - 延迟初始化以处理环境变量加载时序问题
let resendInstance: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY环境变量未配置');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

// 导出兼容性接口
export const resend = new Proxy({} as Resend, {
  get(target, prop) {
    const client = getResendClient();
    return client[prop as keyof Resend];
  }
});

// 邮件发送配置
export const EMAIL_CONFIG = {
  from: 'UW Compass <delivered@resend.dev>', // 使用Resend的测试域名
  replyTo: 'delivered@resend.dev', // 默认回复邮箱
  maxRetries: 3, // 最大重试次数
  retryDelay: 1000, // 重试延迟（毫秒）
} as const

// 基础邮件发送接口
export interface EmailSendOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

// 邮件发送结果
export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
  details?: any
}

/**
 * 基础邮件发送函数
 * 提供错误处理和重试机制
 */
export async function sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
  try {
    // 验证必需参数
    if (!options.to) {
      return {
        success: false,
        error: '收件人邮箱地址为必需参数'
      }
    }

    if (!options.subject) {
      return {
        success: false,
        error: '邮件主题为必需参数'
      }
    }

    if (!options.html && !options.text) {
      return {
        success: false,
        error: '邮件内容（HTML或文本）为必需参数'
      }
    }

    // 准备邮件数据
    const emailData: any = {
      from: options.from || EMAIL_CONFIG.from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      replyTo: options.replyTo || EMAIL_CONFIG.replyTo,
    }

    // 添加内容（至少需要html或text其中一个）
    if (options.html) {
      emailData.html = options.html
    }
    if (options.text) {
      emailData.text = options.text
    }

    // 添加可选字段
    if (options.cc) {
      emailData.cc = Array.isArray(options.cc) ? options.cc : [options.cc]
    }
    if (options.bcc) {
      emailData.bcc = Array.isArray(options.bcc) ? options.bcc : [options.bcc]
    }
    if (options.attachments) {
      emailData.attachments = options.attachments
    }

    console.log('发送邮件:', {
      to: emailData.to,
      subject: emailData.subject,
      from: emailData.from,
      timestamp: new Date().toISOString()
    })

    // 发送邮件
    const client = getResendClient();
    console.log('Sending email with Resend:', {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject
    });
    
    const result = await client.emails.send(emailData)
    
    console.log('Resend API response:', result);

    if (result.error) {
      console.error('Resend邮件发送失败:', result.error)
      return {
        success: false,
        error: result.error.message || '邮件发送失败',
        details: result.error
      }
    }

    console.log('邮件发送成功:', {
      messageId: result.data?.id,
      to: emailData.to,
      subject: emailData.subject
    })

    return {
      success: true,
      messageId: result.data?.id,
      details: result.data
    }

  } catch (error) {
    console.error('邮件发送异常:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '邮件发送异常',
      details: error
    }
  }
}

/**
 * 带重试机制的邮件发送
 * 在网络错误或临时失败时自动重试
 */
export async function sendEmailWithRetry(
  options: EmailSendOptions,
  maxRetries: number = EMAIL_CONFIG.maxRetries
): Promise<EmailSendResult> {
  let lastError: EmailSendResult | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`邮件发送尝试 ${attempt}/${maxRetries}:`, {
        to: options.to,
        subject: options.subject
      })

      const result = await sendEmail(options)
      
      if (result.success) {
        if (attempt > 1) {
          console.log(`邮件发送在第 ${attempt} 次尝试成功`)
        }
        return result
      }

      lastError = result
      
      // 如果是最后一次尝试，直接返回错误
      if (attempt === maxRetries) {
        break
      }

      // 等待后重试
      console.log(`邮件发送失败，${EMAIL_CONFIG.retryDelay}ms后重试...`)
      await new Promise(resolve => setTimeout(resolve, EMAIL_CONFIG.retryDelay * attempt))

    } catch (error) {
      lastError = {
        success: false,
        error: error instanceof Error ? error.message : '邮件发送异常',
        details: error
      }

      if (attempt === maxRetries) {
        break
      }

      await new Promise(resolve => setTimeout(resolve, EMAIL_CONFIG.retryDelay * attempt))
    }
  }

  console.error(`邮件发送在 ${maxRetries} 次尝试后失败:`, lastError)
  return lastError || {
    success: false,
    error: '邮件发送失败，已达到最大重试次数'
  }
}

/**
 * 验证邮箱格式
 * 支持单个邮箱或邮箱数组
 */
export function validateEmail(email: string | string[]): boolean {
  // 更严格的邮箱验证正则：要求至少有一个TLD（如.com, .org等）
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

  if (Array.isArray(email)) {
    return email.every(e => emailRegex.test(e))
  }

  return emailRegex.test(email)
}

/**
 * 检查Resend服务健康状态
 * 用于系统监控和调试
 */
export async function checkResendHealth(): Promise<{
  healthy: boolean
  apiKeyConfigured: boolean
  error?: string
}> {
  try {
    // 检查API密钥配置
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        healthy: false,
        apiKeyConfigured: false,
        error: 'Resend API密钥未配置'
      }
    }

    // 尝试获取域名列表（需要有效的API密钥）
    const client = getResendClient();
    const domains = await client.domains.list()
    
    return {
      healthy: !domains.error,
      apiKeyConfigured: true,
      error: domains.error ? `Resend API错误: ${JSON.stringify(domains.error)}` : undefined
    }

  } catch (error) {
    return {
      healthy: false,
      apiKeyConfigured: !!process.env.RESEND_API_KEY,
      error: error instanceof Error ? error.message : '健康检查失败'
    }
  }
}

// 导出常用邮件模板函数
export { EMAIL_CONFIG as default } 