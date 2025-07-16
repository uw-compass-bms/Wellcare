/**
 * 电子签字生成器 - Task 6.2
 * 用于生成固定格式的电子签字内容
 * 
 * 设计目标：
 * 1. 统一的签字格式：【姓名】signed at【时间戳】
 * 2. 艺术字体样式支持
 * 3. 时区处理和格式化
 * 4. 可配置的样式选项
 */

/**
 * 签字样式配置接口
 */
export interface SignatureStyle {
  // 字体样式
  fontFamily?: 'cursive' | 'serif' | 'sans-serif'
  fontSize?: 'small' | 'medium' | 'large'
  
  // 图标装饰
  useIcon?: boolean
  iconType?: 'pen' | 'check' | 'seal'
  
  // 时间格式
  timeFormat?: 'full' | 'date-only' | 'compact'
  timezone?: string
}

/**
 * 签字内容接口
 */
export interface SignatureContent {
  // 基础内容
  text: string
  
  // 样式信息
  style: SignatureStyle
  
  // 元数据
  metadata: {
    recipientName: string
    timestamp: string
    timezone: string
    format: string
  }
}

/**
 * 默认签字样式配置
 */
export const DEFAULT_SIGNATURE_STYLE: SignatureStyle = {
  fontFamily: 'cursive',
  fontSize: 'medium',
  useIcon: true,
  iconType: 'pen',
  timeFormat: 'full',
  timezone: 'Asia/Shanghai'
}

/**
 * 图标映射
 */
const SIGNATURE_ICONS = {
  pen: '🖋️',
  check: '✔️',
  seal: '📩'
} as const

/**
 * 生成固定格式的电子签字内容
 * 
 * @param recipientName 收件人姓名
 * @param customStyle 自定义样式配置（可选）
 * @returns 完整的签字内容对象
 */
export function generateSignatureContent(
  recipientName: string,
  customStyle: Partial<SignatureStyle> = {}
): SignatureContent {
  // 合并样式配置
  const style: SignatureStyle = {
    ...DEFAULT_SIGNATURE_STYLE,
    ...customStyle
  }

  // 生成时间戳
  const timestamp = generateTimestamp(style.timeFormat!, style.timezone!)
  
  // 生成基础签字文本
  const baseText = `【${recipientName}】signed at【${timestamp}】`
  
  // 添加图标装饰（如果启用）
  const decoratedText = style.useIcon 
    ? `${SIGNATURE_ICONS[style.iconType!]} ${baseText}`
    : baseText

  return {
    text: decoratedText,
    style,
    metadata: {
      recipientName,
      timestamp,
      timezone: style.timezone!,
      format: style.timeFormat!
    }
  }
}

/**
 * 生成简单格式的签字文本（仅用于数据库存储）
 * 
 * @param recipientName 收件人姓名
 * @param timezone 时区（可选，默认上海时区）
 * @returns 简单的签字文本字符串
 */
export function generateSimpleSignature(
  recipientName: string,
  timezone: string = 'Asia/Shanghai'
): string {
  const timestamp = generateTimestamp('full', timezone)
  return `【${recipientName}】signed at【${timestamp}】`
}

/**
 * 生成艺术字体样式的签字文本（用于前端显示）
 * 
 * @param recipientName 收件人姓名
 * @param includeIcon 是否包含图标
 * @returns 艺术字体格式的签字内容
 */
export function generateArtisticSignature(
  recipientName: string,
  includeIcon: boolean = true
): string {
  const timestamp = generateTimestamp('compact', 'Asia/Shanghai')
  
  // 转换为艺术字体（使用Unicode数学字符）
  const artisticName = convertToArtisticFont(recipientName)
  
  if (includeIcon) {
    return `🖋️ ${artisticName}\n✔️ Digital Signature · ${timestamp}`
  } else {
    return `${artisticName}\nDigital Signature · ${timestamp}`
  }
}

/**
 * 转换文本为艺术字体
 * 使用Unicode数学字符实现艺术效果
 */
function convertToArtisticFont(text: string): string {
  // 简单的艺术字体映射（仅英文字符）
  const artisticMap: Record<string, string> = {
    'A': '𝑨', 'B': '𝑩', 'C': '𝑪', 'D': '𝑫', 'E': '𝑬', 'F': '𝑭', 'G': '𝑮',
    'H': '𝑯', 'I': '𝑰', 'J': '𝑱', 'K': '𝑲', 'L': '𝑳', 'M': '𝑴', 'N': '𝑵',
    'O': '𝑶', 'P': '𝑷', 'Q': '𝑸', 'R': '𝑹', 'S': '𝑺', 'T': '𝑻', 'U': '𝑼',
    'V': '𝑽', 'W': '𝑾', 'X': '𝑿', 'Y': '𝒀', 'Z': '𝒁',
    'a': '𝒂', 'b': '𝒃', 'c': '𝒄', 'd': '𝒅', 'e': '𝒆', 'f': '𝒇', 'g': '𝒈',
    'h': '𝒉', 'i': '𝒊', 'j': '𝒋', 'k': '𝒌', 'l': '𝒍', 'm': '𝒎', 'n': '𝒏',
    'o': '𝒐', 'p': '𝒑', 'q': '𝒒', 'r': '𝒓', 's': '𝒔', 't': '𝒕', 'u': '𝒖',
    'v': '𝒗', 'w': '𝒘', 'x': '𝒙', 'y': '𝒚', 'z': '𝒛'
  }

  return text
    .split('')
    .map(char => artisticMap[char] || char)
    .join('')
}

/**
 * 生成格式化时间戳
 * 
 * @param format 时间格式类型
 * @param timezone 时区
 * @returns 格式化的时间字符串
 */
function generateTimestamp(
  format: 'full' | 'date-only' | 'compact',
  timezone: string
): string {
  const now = new Date()
  
  // 时区处理
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    ...(format === 'full' && {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }),
    ...(format === 'date-only' && {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }),
    ...(format === 'compact' && {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  if (format === 'full') {
    // 格式: 2025-07-15 18:30:45
    return now.toLocaleString('sv-SE', options).replace('T', ' ')
  } else if (format === 'date-only') {
    // 格式: 2025-07-15
    return now.toLocaleDateString('sv-SE', options)
  } else {
    // 格式: 2025-07-15 (compact)
    return now.toLocaleDateString('sv-SE', options)
  }
}

/**
 * 验证收件人姓名格式
 * 
 * @param name 收件人姓名
 * @returns 是否为有效姓名
 */
export function validateRecipientName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false
  }

  // 基础验证
  const trimmedName = name.trim()
  if (trimmedName.length === 0 || trimmedName.length > 50) {
    return false
  }

  // 不允许特殊字符（但允许中文、英文、空格、连字符）
  const validNamePattern = /^[\u4e00-\u9fa5a-zA-Z\s\-\.]+$/
  return validNamePattern.test(trimmedName)
}

/**
 * 获取支持的时区列表
 */
export function getSupportedTimezones(): string[] {
  return [
    'Asia/Shanghai',    // 中国标准时间
    'Asia/Tokyo',       // 日本标准时间
    'Asia/Seoul',       // 韩国标准时间
    'Asia/Hong_Kong',   // 香港时间
    'Asia/Singapore',   // 新加坡时间
    'America/New_York', // 美国东部时间
    'America/Los_Angeles', // 美国西部时间
    'Europe/London',    // 英国时间
    'Europe/Paris',     // 欧洲中部时间
    'UTC'               // 协调世界时
  ]
}

/**
 * 批量生成签字内容（用于批量签字场景）
 * 
 * @param recipients 收件人列表
 * @param style 统一样式配置
 * @returns 签字内容数组
 */
export function generateBatchSignatures(
  recipients: Array<{ name: string; id: string }>,
  style: Partial<SignatureStyle> = {}
): Array<{ recipientId: string; signature: SignatureContent }> {
  return recipients.map(recipient => ({
    recipientId: recipient.id,
    signature: generateSignatureContent(recipient.name, style)
  }))
} 