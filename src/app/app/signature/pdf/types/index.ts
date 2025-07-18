/**
 * PDF签名系统类型定义
 */

// Widget基础类型
export type WidgetType = 'signature' | 'date' | 'text' | 'name' | 'email' | 'initials';

// Widget位置和尺寸 (百分比)
export interface WidgetPosition {
  x: number; // 0-100
  y: number; // 0-100  
  width: number; // 0-100
  height: number; // 0-100
}

// Widget数据结构
export interface Widget extends WidgetPosition {
  id: string;
  type: WidgetType;
  page: number;
  value: string;
  placeholder: string;
  recipientId: string;
  isRequired?: boolean;
  fontSize?: number;
  fontColor?: string;
}

// Widget模板定义
export interface WidgetTemplate {
  type: WidgetType;
  label: string;
  icon: string;
  color: string;
  defaultSize: {
    width: number;
    height: number;
  };
  minSize?: {
    width: number;
    height: number;
  };
}

// 收件人信息
export interface RecipientInfo {
  id: string;
  name: string;
  email: string;
  status: string;
  color?: string;
}

// 文件信息
export interface FileInfo {
  id: string;
  displayName: string;
  originalFilename: string;
  supabaseUrl: string;
  pageCount?: number;
}

// PDF页面信息
export interface PDFPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  scale: number;
}

// 拖拽状态
export interface DragState {
  isDragging: boolean;
  dragType: WidgetType | null;
  dragPosition: { x: number; y: number } | null;
}

// 组件Props接口
export interface PDFSignatureProps {
  taskId: string;
  files: FileInfo[];
  recipients: RecipientInfo[];
  onSave?: (widgets: Widget[]) => Promise<void>;
  onSend?: () => Promise<void>;
  readOnly?: boolean;
}

export interface WidgetPaletteProps {
  templates: WidgetTemplate[];
  selectedRecipient: RecipientInfo;
  onDragStart: (type: WidgetType) => void;
  onDragEnd: () => void;
}

export interface PDFRendererProps {
  file: FileInfo;
  scale: number;
  currentPage: number;
  widgets: Widget[];
  selectedWidget: string | null;
  onWidgetSelect: (widgetId: string | null) => void;
  onWidgetUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  onWidgetDelete: (widgetId: string) => void;
  onWidgetDrop: (position: { x: number; y: number }, type: WidgetType) => void;
  readOnly?: boolean;
}

export interface WidgetPropertiesProps {
  widget: Widget | null;
  recipient: RecipientInfo | null;
  onUpdate: (updates: Partial<Widget>) => void;
  onDelete: () => void;
}

// 状态管理接口
export interface PDFSignatureState {
  widgets: Widget[];
  selectedWidget: string | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  dragState: DragState;
  isLoading: boolean;
  error: string | null;
}

// Action接口
export interface PDFSignatureActions {
  addWidget: (widget: Omit<Widget, 'id'>) => void;
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  deleteWidget: (id: string) => void;
  selectWidget: (id: string | null) => void;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number) => void;
  setDragState: (dragState: Partial<DragState>) => void;
  loadWidgets: (widgets: Widget[]) => void;
  clearError: () => void;
}