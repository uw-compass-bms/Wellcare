/**
 * Step 5.1.1: 坐标系统类型定义
 * 用于PDF签字位置的坐标管理
 */

// 基础坐标点 (百分比格式: 0-100)
export interface CoordinatePoint {
  x: number  // x坐标百分比 (0-100)
  y: number  // y坐标百分比 (0-100)
}

// 坐标尺寸 (百分比格式: 0-100)
export interface CoordinateSize {
  width: number   // 宽度百分比 (0-100)
  height: number  // 高度百分比 (0-100)
}

// 完整的签字位置坐标 (百分比坐标系统)
export interface SignaturePosition extends CoordinatePoint, CoordinateSize {
  pageNumber: number  // PDF页码 (从1开始)
  recipientId: string // 收件人ID
}

// 像素坐标点 (用于前端显示和转换)
export interface PixelPoint {
  x: number  // x像素坐标
  y: number  // y像素坐标
}

// 像素尺寸 (用于前端显示和转换)
export interface PixelSize {
  width: number   // 宽度像素
  height: number  // 高度像素
}

// 完整的像素坐标信息
export interface PixelPosition extends PixelPoint, PixelSize {
  pageNumber: number
}

// PDF页面尺寸信息 (用于坐标转换)
export interface PageDimensions {
  width: number   // 页面宽度 (像素)
  height: number  // 页面高度 (像素)
  pageNumber: number
}

// 坐标验证结果
export interface CoordinateValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

// 坐标转换选项
export interface CoordinateConversionOptions {
  pageDimensions: PageDimensions
  precision?: number  // 精度控制，默认2位小数
}

// 数据库中的签字位置记录
export interface SignaturePositionRecord {
  id: string
  recipient_id: string
  x: number           // 百分比坐标
  y: number           // 百分比坐标  
  width: number       // 百分比宽度
  height: number      // 百分比高度
  page_number: number
  created_at: string
  updated_at: string
}

// 坐标系统常量
export const COORDINATE_CONSTANTS = {
  // 坐标范围
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
  
  // 尺寸限制
  MIN_SIGNATURE_WIDTH: 1,    // 最小签字框宽度 (百分比)
  MIN_SIGNATURE_HEIGHT: 0.5, // 最小签字框高度 (百分比)
  MAX_SIGNATURE_WIDTH: 50,   // 最大签字框宽度 (百分比) - 增加到50%
  MAX_SIGNATURE_HEIGHT: 30,  // 最大签字框高度 (百分比) - 增加到30%
  
  // 页码限制
  MIN_PAGE_NUMBER: 1,
  MAX_PAGE_NUMBER: 1000,     // 假设PDF最多1000页
  
  // 精度控制
  DEFAULT_PRECISION: 2,      // 默认保留2位小数
  MAX_PRECISION: 4           // 最大保留4位小数
} as const

// 坐标系统错误类型
export enum CoordinateErrorType {
  INVALID_X = 'INVALID_X',
  INVALID_Y = 'INVALID_Y', 
  INVALID_WIDTH = 'INVALID_WIDTH',
  INVALID_HEIGHT = 'INVALID_HEIGHT',
  INVALID_PAGE_NUMBER = 'INVALID_PAGE_NUMBER',
  OUT_OF_BOUNDS = 'OUT_OF_BOUNDS',
  PRECISION_ERROR = 'PRECISION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD'
}

// 坐标系统错误信息映射
export const COORDINATE_ERROR_MESSAGES: Record<CoordinateErrorType, string> = {
  [CoordinateErrorType.INVALID_X]: 'X坐标必须在0-100范围内',
  [CoordinateErrorType.INVALID_Y]: 'Y坐标必须在0-100范围内',
  [CoordinateErrorType.INVALID_WIDTH]: '宽度必须在有效范围内',
  [CoordinateErrorType.INVALID_HEIGHT]: '高度必须在有效范围内', 
  [CoordinateErrorType.INVALID_PAGE_NUMBER]: '页码必须大于0',
  [CoordinateErrorType.OUT_OF_BOUNDS]: '签字位置超出页面边界',
  [CoordinateErrorType.PRECISION_ERROR]: '坐标精度超出允许范围',
  [CoordinateErrorType.MISSING_REQUIRED_FIELD]: '缺少必要的坐标字段'
} 