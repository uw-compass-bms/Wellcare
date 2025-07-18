/**
 * 坐标系统类型定义
 * 
 * 设计原则：
 * 1. 前端统一使用百分比坐标（0-100）
 * 2. 后端PDF渲染使用像素坐标
 * 3. API层负责坐标转换
 */

/**
 * 百分比坐标 - 用于前端响应式显示
 * 所有值都是相对于容器的百分比（0-100）
 */
export interface PercentageCoordinates {
  x: number;      // X轴百分比 (0-100)
  y: number;      // Y轴百分比 (0-100)
  width: number;  // 宽度百分比 (0-100)
  height: number; // 高度百分比 (0-100)
}

/**
 * 像素坐标 - 用于后端PDF精确渲染
 * 所有值都是绝对像素值
 */
export interface PixelCoordinates {
  x: number;      // X轴像素值
  y: number;      // Y轴像素值
  width: number;  // 宽度像素值
  height: number; // 高度像素值
}

/**
 * 页面尺寸信息
 */
export interface PageDimensions {
  width: number;  // 页面宽度（像素）
  height: number; // 页面高度（像素）
}

/**
 * 完整的位置信息 - 包含双坐标系统
 */
export interface SignatureCoordinates {
  pageNumber: number;
  percentage: PercentageCoordinates;
  pixel: PixelCoordinates;
  pageDimensions: PageDimensions;
}

/**
 * 拖拽事件数据
 */
export interface DragEventData {
  mouseX: number;        // 鼠标X坐标（相对于容器）
  mouseY: number;        // 鼠标Y坐标（相对于容器）
  containerWidth: number;  // 容器宽度
  containerHeight: number; // 容器高度
  widgetType: string;      // 组件类型
}

/**
 * 坐标验证结果
 */
export interface CoordinateValidation {
  isValid: boolean;
  errors?: string[];
}