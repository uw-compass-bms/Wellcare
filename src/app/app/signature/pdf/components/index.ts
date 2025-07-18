/**
 * PDF签名组件统一导出
 */

// 主布局组件
export { default as PDFSignatureLayout } from './layout/PDFSignatureLayout';
export { default as PDFHeader } from './layout/PDFHeader';

// PDF渲染组件
export { default as PDFRenderer } from './pdf/PDFRenderer';
export { default as PDFPage } from './pdf/PDFPage';
export { default as PDFNavigation } from './pdf/PDFNavigation';
export { default as PDFZoomControls } from './pdf/PDFZoomControls';

// Widget组件
export { default as WidgetPalette } from './widgets/WidgetPalette';
export { default as DraggableWidget } from './widgets/DraggableWidget';
export { default as PlacedWidget } from './widgets/PlacedWidget';

// UI组件
export { default as RecipientSelector } from './ui/RecipientSelector';
export { default as WidgetPropertiesPanel } from './ui/WidgetPropertiesPanel';

// 配置和工具
export { WIDGET_TEMPLATES, getWidgetTemplate, getAllWidgetTemplates } from './widgets/widget-templates';

// Hook
export { usePDFSignature } from '../hooks/usePDFSignature';

// 类型定义
export * from '../types';

// 保持向后兼容
export { default as PDFSignatureViewer } from './pdf-signature-viewer';