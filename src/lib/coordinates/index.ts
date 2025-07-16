/**
 * Task 5.1: 坐标系统实现 - 统一入口
 * 提供PDF签字位置坐标管理的完整解决方案
 */

// 导出类型定义
export type {
  CoordinatePoint,
  CoordinateSize,
  SignaturePosition,
  PixelPoint,
  PixelSize,
  PixelPosition,
  PageDimensions,
  CoordinateValidationResult,
  CoordinateConversionOptions,
  SignaturePositionRecord
} from './types'

export {
  COORDINATE_CONSTANTS,
  CoordinateErrorType,
  COORDINATE_ERROR_MESSAGES
} from './types'

// 导出验证函数
export {
  validateCoordinatePoint,
  validateCoordinateSize,
  validatePageNumber,
  validateSignatureBounds,
  validateSignaturePosition,
  validateMultipleSignaturePositions
} from './validator'

// 导出转换函数
export {
  percentageToPixel,
  pixelToPercentage,
  percentageSizeToPixel,
  pixelSizeToPercentage,
  signaturePositionToPixel,
  pixelPositionToSignature,
  batchSignaturePositionsToPixel,
  batchPixelPositionsToSignature,
  convertCoordinateSystem,
  scaleCoordinates,
  offsetCoordinates,
  constrainCoordinates,
  createPageDimensionsMap,
} from './converter'

// 导出冲突检测函数
export type {
  ConflictDetectionResult,
  ConflictInfo,
  PositionArea
} from './conflict-detector'

export {
  calculateOverlapArea,
  detectPositionConflict,
  detectBatchConflicts,
  detectInternalConflicts,
  getSuggestedPositions,
  optimizePositionLayout
} from './conflict-detector'

// 导出转换接口类型
export type { CoordinateSystemConversion } from './converter' 