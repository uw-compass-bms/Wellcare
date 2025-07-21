/**
 * Task 7.2: 邮件模板系统
 * 
 * 实现邮件模板渲染和变量处理功能
 * 特性：
 * - 模板变量替换
 * - HTML和文本格式支持
 * - 签字邀请邮件模板
 * - 模板验证和错误处理
 */

// 签字邀请邮件模板变量接口
export interface SignatureInviteTemplateVars {
  recipientName: string      // 收件人姓名
  senderName: string         // 发送人姓名  
  documentTitle: string      // 文档标题
  signatureUrl: string       // 签字链接
  expiryDate?: string        // 过期时间
  taskId: string            // 任务ID
  companyName?: string      // 公司名称
  message?: string          // 自定义消息
}

// 邮件模板类型
export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

// 模板渲染结果
export interface TemplateRenderResult {
  success: boolean
  template?: EmailTemplate
  error?: string
}

/**
 * 模板变量替换函数
 * 支持 {{variableName}} 格式的变量替换
 */
export function replaceTemplateVariables(
  template: string, 
  variables: Record<string, string>
): string {
  let result = template
  
  // 使用正则表达式查找并替换所有 {{variableName}} 格式的变量
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    result = result.replace(regex, value || '')
  })
  
  return result
}

/**
 * 验证模板变量完整性
 * 检查所有必需的模板变量是否已提供
 */
export function validateTemplateVariables(
  template: string, 
  variables: Record<string, string>
): { isValid: boolean; missingVars: string[] } {
  const variablePattern = /{{(\s*\w+\s*)}}/g
  const requiredVars = new Set<string>()
  let match
  
  // 提取所有模板中的变量名
  while ((match = variablePattern.exec(template)) !== null) {
    const varName = match[1].trim()
    requiredVars.add(varName)
  }
  
  // 检查缺失的变量
  const missingVars: string[] = []
  requiredVars.forEach(varName => {
    if (!variables[varName]) {
      missingVars.push(varName)
    }
  })
  
  return {
    isValid: missingVars.length === 0,
    missingVars
  }
}

/**
 * 签字邀请邮件模板 - HTML格式
 */
const SIGNATURE_INVITE_HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>签字邀请 - {{documentTitle}}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: #4f46e5;
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
        }
        .document-info {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .document-info h3 {
            margin: 0 0 10px 0;
            color: #4f46e5;
            font-size: 18px;
        }
        .sign-button {
            display: inline-block;
            background: #059669;
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
        }
        .sign-button:hover {
            background: #047857;
        }
        .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }
        .expiry-notice {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .task-id {
            font-size: 12px;
            color: #9ca3af;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🖋️ 电子签字邀请</h1>
        </div>
        
        <div class="content">
            <p>尊敬的 <strong>{{recipientName}}</strong>，您好！</p>
            
            <p><strong>{{senderName}}</strong> 邀请您对以下文档进行电子签字：</p>
            
            <div class="document-info">
                <h3>📄 {{documentTitle}}</h3>
                {{#if companyName}}
                <p><strong>公司：</strong> {{companyName}}</p>
                {{/if}}
                {{#if message}}
                <p><strong>消息：</strong> {{message}}</p>
                {{/if}}
            </div>
            
            {{#if expiryDate}}
            <div class="expiry-notice">
                <strong>⏰ 重要提醒：</strong> 请在 <strong>{{expiryDate}}</strong> 之前完成签字，过期后链接将失效。
            </div>
            {{/if}}
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{signatureUrl}}" class="sign-button">
                    🖊️ 立即签字
                </a>
            </div>
            
            <p>如果按钮无法点击，请复制以下链接到浏览器打开：</p>
            <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace;">
                {{signatureUrl}}
            </p>
            
            <p style="margin-top: 30px;">
                如有任何问题，请联系发送人 <strong>{{senderName}}</strong>。
            </p>
        </div>
        
        <div class="footer">
            <p>此邮件由 UW Compass 电子签字系统自动发送</p>
            <p class="task-id">任务ID: {{taskId}}</p>
        </div>
    </div>
</body>
</html>
`

/**
 * 签字邀请邮件模板 - 文本格式
 */
const SIGNATURE_INVITE_TEXT_TEMPLATE = `
🖋️ 电子签字邀请

尊敬的 {{recipientName}}，您好！

{{senderName}} 邀请您对以下文档进行电子签字：

📄 文档信息
标题：{{documentTitle}}
{{#if companyName}}公司：{{companyName}}{{/if}}
{{#if message}}消息：{{message}}{{/if}}

{{#if expiryDate}}
⏰ 重要提醒：请在 {{expiryDate}} 之前完成签字，过期后链接将失效。
{{/if}}

🖊️ 请点击以下链接进行签字：
{{signatureUrl}}

如有任何问题，请联系发送人 {{senderName}}。

---
此邮件由 UW Compass 电子签字系统自动发送
任务ID: {{taskId}}
`

/**
 * 签字邀请邮件主题模板
 */
const SIGNATURE_INVITE_SUBJECT_TEMPLATE = `签字邀请：{{documentTitle}} - 来自{{senderName}}`

/**
 * 渲染签字邀请邮件模板
 */
export function renderSignatureInviteTemplate(
  variables: SignatureInviteTemplateVars
): TemplateRenderResult {
  try {
    // 验证必需的变量
    const requiredVars = ['recipientName', 'senderName', 'documentTitle', 'signatureUrl', 'taskId']
    const missingVars = requiredVars.filter(varName => !variables[varName as keyof SignatureInviteTemplateVars])
    
    if (missingVars.length > 0) {
      return {
        success: false,
        error: `缺少必需的模板变量: ${missingVars.join(', ')}`
      }
    }
    
    // 准备模板变量（包含条件逻辑处理）
    const templateVars: Record<string, string> = {
      recipientName: variables.recipientName,
      senderName: variables.senderName,
      documentTitle: variables.documentTitle,
      signatureUrl: variables.signatureUrl,
      taskId: variables.taskId,
      companyName: variables.companyName || '',
      message: variables.message || '',
      expiryDate: variables.expiryDate || ''
    }
    
    // 简单的条件逻辑处理 - 移除空条件块
    let htmlTemplate = SIGNATURE_INVITE_HTML_TEMPLATE
    let textTemplate = SIGNATURE_INVITE_TEXT_TEMPLATE
    
    // 处理 companyName 条件
    if (!variables.companyName) {
      htmlTemplate = htmlTemplate.replace(/{{#if companyName}}[\s\S]*?{{\/if}}/g, '')
      textTemplate = textTemplate.replace(/{{#if companyName}}[\s\S]*?{{\/if}}/g, '')
    } else {
      htmlTemplate = htmlTemplate.replace(/{{#if companyName}}([\s\S]*?){{\/if}}/g, '$1')
      textTemplate = textTemplate.replace(/{{#if companyName}}([\s\S]*?){{\/if}}/g, '$1')
    }
    
    // 处理 message 条件
    if (!variables.message) {
      htmlTemplate = htmlTemplate.replace(/{{#if message}}[\s\S]*?{{\/if}}/g, '')
      textTemplate = textTemplate.replace(/{{#if message}}[\s\S]*?{{\/if}}/g, '')
    } else {
      htmlTemplate = htmlTemplate.replace(/{{#if message}}([\s\S]*?){{\/if}}/g, '$1')
      textTemplate = textTemplate.replace(/{{#if message}}([\s\S]*?){{\/if}}/g, '$1')
    }
    
    // 处理 expiryDate 条件
    if (!variables.expiryDate) {
      htmlTemplate = htmlTemplate.replace(/{{#if expiryDate}}[\s\S]*?{{\/if}}/g, '')
      textTemplate = textTemplate.replace(/{{#if expiryDate}}[\s\S]*?{{\/if}}/g, '')
    } else {
      htmlTemplate = htmlTemplate.replace(/{{#if expiryDate}}([\s\S]*?){{\/if}}/g, '$1')
      textTemplate = textTemplate.replace(/{{#if expiryDate}}([\s\S]*?){{\/if}}/g, '$1')
    }
    
    // 渲染最终模板
    const template: EmailTemplate = {
      subject: replaceTemplateVariables(SIGNATURE_INVITE_SUBJECT_TEMPLATE, templateVars),
      html: replaceTemplateVariables(htmlTemplate, templateVars),
      text: replaceTemplateVariables(textTemplate, templateVars)
    }
    
    return {
      success: true,
      template
    }
    
  } catch (error) {
    return {
      success: false,
      error: `模板渲染失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

// 签字完成邮件模板变量接口
export interface SignatureCompleteTemplateVars {
  recipientName: string      // 收件人姓名
  documentTitle: string      // 文档标题
  signedAt: string          // 签字时间
  downloadUrl?: string      // 下载链接（可选）
}

/**
 * 签字完成邮件模板 - HTML格式
 */
const SIGNATURE_COMPLETE_HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>签字完成确认 - {{documentTitle}}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: #059669;
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
        }
        .success-icon {
            font-size: 48px;
            text-align: center;
            margin: 20px 0;
        }
        .info-box {
            background: #f0fdf4;
            border: 1px solid #86efac;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ 签字完成确认</h1>
        </div>
        
        <div class="content">
            <div class="success-icon">
                🎉
            </div>
            
            <p>尊敬的 <strong>{{recipientName}}</strong>，您好！</p>
            
            <p>您已成功完成了以下文档的电子签字：</p>
            
            <div class="info-box">
                <h3 style="margin-top: 0;">📄 {{documentTitle}}</h3>
                <p><strong>签字时间：</strong> {{signedAt}}</p>
            </div>
            
            <p>感谢您完成电子签字！如果所有签字人都已完成签字，您将会收到包含所有签名的最终文档。</p>
            
            {{#if downloadUrl}}
            <p style="margin-top: 30px;">
                <a href="{{downloadUrl}}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600;">
                    📥 下载已签字文档
                </a>
            </p>
            {{/if}}
        </div>
        
        <div class="footer">
            <p>此邮件由 UW Compass 电子签字系统自动发送</p>
        </div>
    </div>
</body>
</html>
`

/**
 * 签字完成邮件模板 - 文本格式
 */
const SIGNATURE_COMPLETE_TEXT_TEMPLATE = `
✅ 签字完成确认

尊敬的 {{recipientName}}，您好！

您已成功完成了以下文档的电子签字：

📄 文档：{{documentTitle}}
🕐 签字时间：{{signedAt}}

感谢您完成电子签字！如果所有签字人都已完成签字，您将会收到包含所有签名的最终文档。

{{#if downloadUrl}}
📥 下载已签字文档：
{{downloadUrl}}
{{/if}}

---
此邮件由 UW Compass 电子签字系统自动发送
`

/**
 * 签字完成邮件主题模板
 */
const SIGNATURE_COMPLETE_SUBJECT_TEMPLATE = `签字完成确认：{{documentTitle}}`

/**
 * 渲染签字完成邮件模板
 */
export function renderSignatureCompleteTemplate(
  variables: SignatureCompleteTemplateVars
): TemplateRenderResult {
  try {
    // 验证必需的变量
    const requiredVars = ['recipientName', 'documentTitle', 'signedAt']
    const missingVars = requiredVars.filter(varName => !variables[varName as keyof SignatureCompleteTemplateVars])
    
    if (missingVars.length > 0) {
      return {
        success: false,
        error: `缺少必需的模板变量: ${missingVars.join(', ')}`
      }
    }
    
    // 准备模板变量
    const templateVars: Record<string, string> = {
      recipientName: variables.recipientName,
      documentTitle: variables.documentTitle,
      signedAt: variables.signedAt,
      downloadUrl: variables.downloadUrl || ''
    }
    
    // 简单的条件逻辑处理
    let htmlTemplate = SIGNATURE_COMPLETE_HTML_TEMPLATE
    let textTemplate = SIGNATURE_COMPLETE_TEXT_TEMPLATE
    
    // 处理 downloadUrl 条件
    if (!variables.downloadUrl) {
      htmlTemplate = htmlTemplate.replace(/{{#if downloadUrl}}[\s\S]*?{{\/if}}/g, '')
      textTemplate = textTemplate.replace(/{{#if downloadUrl}}[\s\S]*?{{\/if}}/g, '')
    } else {
      htmlTemplate = htmlTemplate.replace(/{{#if downloadUrl}}([\s\S]*?){{\/if}}/g, '$1')
      textTemplate = textTemplate.replace(/{{#if downloadUrl}}([\s\S]*?){{\/if}}/g, '$1')
    }
    
    // 渲染最终模板
    const template: EmailTemplate = {
      subject: replaceTemplateVariables(SIGNATURE_COMPLETE_SUBJECT_TEMPLATE, templateVars),
      html: replaceTemplateVariables(htmlTemplate, templateVars),
      text: replaceTemplateVariables(textTemplate, templateVars)
    }
    
    return {
      success: true,
      template
    }
    
  } catch (error) {
    return {
      success: false,
      error: `模板渲染失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * 获取所有可用的邮件模板类型
 */
export const EMAIL_TEMPLATE_TYPES = {
  SIGNATURE_INVITE: 'signature_invite',
  SIGNATURE_COMPLETE: 'signature_complete'
} as const

export type EmailTemplateType = typeof EMAIL_TEMPLATE_TYPES[keyof typeof EMAIL_TEMPLATE_TYPES]

/**
 * 通用模板渲染函数
 */
export function renderEmailTemplate(
  templateType: EmailTemplateType,
  variables: any
): TemplateRenderResult {
  switch (templateType) {
    case EMAIL_TEMPLATE_TYPES.SIGNATURE_INVITE:
      return renderSignatureInviteTemplate(variables)
    case EMAIL_TEMPLATE_TYPES.SIGNATURE_COMPLETE:
      return renderSignatureCompleteTemplate(variables)
    default:
      return {
        success: false,
        error: `未知的模板类型: ${templateType}`
      }
  }
} 