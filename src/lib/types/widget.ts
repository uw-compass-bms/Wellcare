/**
 * 简化的Widget类型系统
 * 参考OpenSign的设计，但更加精简
 */

// Widget类型枚举
export enum WidgetType {
  Signature = 'signature',
  Date = 'date',
  Text = 'text',
  Name = 'name',
  Email = 'email',
  Initials = 'initials',
  // Company = 'company',  // 可选扩展
  // Checkbox = 'checkbox', // 可选扩展
}

// Widget数据接口
export interface Widget {
  id: string;           // 唯一标识
  type: WidgetType;     // 类型
  recipientId: string;  // 所属收件人
  fileId: string;       // 所属文件
  page: number;         // 页码
  x: number;            // X坐标（百分比）
  y: number;            // Y坐标（百分比）
  width: number;        // 宽度（百分比）
  height: number;       // 高度（百分比）
  placeholder?: string; // 占位符文本
  value?: string;       // 填充的值
  required?: boolean;   // 是否必填
  zIndex?: number;      // 层级
}

// Widget默认配置
export const WIDGET_DEFAULTS: Record<WidgetType, { width: number; height: number; placeholder: string }> = {
  [WidgetType.Signature]: { width: 15, height: 8, placeholder: 'Sign here' },
  [WidgetType.Date]: { width: 12, height: 6, placeholder: 'Date' },
  [WidgetType.Text]: { width: 20, height: 6, placeholder: 'Enter text' },
  [WidgetType.Name]: { width: 20, height: 6, placeholder: 'Full name' },
  [WidgetType.Email]: { width: 25, height: 6, placeholder: 'Email address' },
  [WidgetType.Initials]: { width: 10, height: 6, placeholder: 'Initials' },
};

// Widget样式配置
export const WIDGET_STYLES: Record<WidgetType, { bg: string; border: string; text: string; icon: string }> = {
  [WidgetType.Signature]: { 
    bg: 'bg-blue-50', 
    border: 'border-blue-300', 
    text: 'text-blue-700',
    icon: '✍️'
  },
  [WidgetType.Date]: { 
    bg: 'bg-green-50', 
    border: 'border-green-300', 
    text: 'text-green-700',
    icon: '📅'
  },
  [WidgetType.Text]: { 
    bg: 'bg-purple-50', 
    border: 'border-purple-300', 
    text: 'text-purple-700',
    icon: '📝'
  },
  [WidgetType.Name]: { 
    bg: 'bg-pink-50', 
    border: 'border-pink-300', 
    text: 'text-pink-700',
    icon: '👤'
  },
  [WidgetType.Email]: { 
    bg: 'bg-yellow-50', 
    border: 'border-yellow-300', 
    text: 'text-yellow-700',
    icon: '📧'
  },
  [WidgetType.Initials]: { 
    bg: 'bg-indigo-50', 
    border: 'border-indigo-300', 
    text: 'text-indigo-700',
    icon: '🔤'
  },
};

// 创建新Widget的辅助函数
export function createWidget(
  type: WidgetType,
  recipientId: string,
  fileId: string,
  page: number,
  x: number,
  y: number
): Widget {
  const defaults = WIDGET_DEFAULTS[type];
  
  return {
    id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    recipientId,
    fileId,
    page,
    x: Math.max(0, Math.min(100 - defaults.width, x)),
    y: Math.max(0, Math.min(100 - defaults.height, y)),
    width: defaults.width,
    height: defaults.height,
    placeholder: defaults.placeholder,
    required: type === WidgetType.Signature, // 签名默认必填
    zIndex: 1
  };
}

// Widget数据与数据库字段的转换
export function widgetToPosition(widget: Widget) {
  return {
    recipient_id: widget.recipientId,
    file_id: widget.fileId,
    page_number: widget.page,
    x_percent: widget.x,
    y_percent: widget.y,
    width_percent: widget.width,
    height_percent: widget.height,
    placeholder_text: widget.placeholder,
    status: widget.value ? 'signed' : 'pending',
    signature_content: widget.value
  };
}

export function positionToWidget(position: any, recipientId: string, fileId: string): Widget {
  return {
    id: position.id,
    type: detectWidgetType(position.placeholder_text || ''),
    recipientId: recipientId,
    fileId: fileId,
    page: position.page_number,
    x: position.x_percent,
    y: position.y_percent,
    width: position.width_percent,
    height: position.height_percent,
    placeholder: position.placeholder_text,
    value: position.signature_content,
    required: true,
    zIndex: 1
  };
}

// 从占位符文本检测Widget类型
function detectWidgetType(placeholder: string): WidgetType {
  const lowerPlaceholder = placeholder.toLowerCase();
  
  if (lowerPlaceholder.includes('date')) return WidgetType.Date;
  if (lowerPlaceholder.includes('email')) return WidgetType.Email;
  if (lowerPlaceholder.includes('name')) return WidgetType.Name;
  if (lowerPlaceholder.includes('initial')) return WidgetType.Initials;
  if (lowerPlaceholder.includes('text')) return WidgetType.Text;
  
  return WidgetType.Signature;
}