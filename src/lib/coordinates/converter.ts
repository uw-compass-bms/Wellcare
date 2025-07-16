/**
 * Step 5.1.3: 坐标转换工具函数
 * 提供百分比坐标与像素坐标之间的转换功能
 */

import {
  CoordinatePoint,
  CoordinateSize,
  SignaturePosition,
  PixelPoint,
  PixelSize,
  PixelPosition,
  PageDimensions,
  CoordinateConversionOptions,
  COORDINATE_CONSTANTS
} from './types'

/**
 * 百分比坐标转像素坐标
 */
export function percentageToPixel(
  percentagePoint: CoordinatePoint,
  pageDimensions: PageDimensions,
  precision: number = COORDINATE_CONSTANTS.DEFAULT_PRECISION
): PixelPoint {
  const pixelX = (percentagePoint.x / 100) * pageDimensions.width
  const pixelY = (percentagePoint.y / 100) * pageDimensions.height
  
  return {
    x: roundToPrecision(pixelX, precision),
    y: roundToPrecision(pixelY, precision)
  }
}

/**
 * 像素坐标转百分比坐标
 */
export function pixelToPercentage(
  pixelPoint: PixelPoint,
  pageDimensions: PageDimensions,
  precision: number = COORDINATE_CONSTANTS.DEFAULT_PRECISION
): CoordinatePoint {
  const percentageX = (pixelPoint.x / pageDimensions.width) * 100
  const percentageY = (pixelPoint.y / pageDimensions.height) * 100
  
  return {
    x: roundToPrecision(percentageX, precision),
    y: roundToPrecision(percentageY, precision)
  }
}

/**
 * 百分比尺寸转像素尺寸
 */
export function percentageSizeToPixel(
  percentageSize: CoordinateSize,
  pageDimensions: PageDimensions,
  precision: number = COORDINATE_CONSTANTS.DEFAULT_PRECISION
): PixelSize {
  const pixelWidth = (percentageSize.width / 100) * pageDimensions.width
  const pixelHeight = (percentageSize.height / 100) * pageDimensions.height
  
  return {
    width: roundToPrecision(pixelWidth, precision),
    height: roundToPrecision(pixelHeight, precision)
  }
}

/**
 * 像素尺寸转百分比尺寸
 */
export function pixelSizeToPercentage(
  pixelSize: PixelSize,
  pageDimensions: PageDimensions,
  precision: number = COORDINATE_CONSTANTS.DEFAULT_PRECISION
): CoordinateSize {
  const percentageWidth = (pixelSize.width / pageDimensions.width) * 100
  const percentageHeight = (pixelSize.height / pageDimensions.height) * 100
  
  return {
    width: roundToPrecision(percentageWidth, precision),
    height: roundToPrecision(percentageHeight, precision)
  }
}

/**
 * 完整签字位置：百分比转像素
 */
export function signaturePositionToPixel(
  signaturePosition: SignaturePosition,
  pageDimensions: PageDimensions,
  precision: number = COORDINATE_CONSTANTS.DEFAULT_PRECISION
): PixelPosition {
  const pixelPoint = percentageToPixel(signaturePosition, pageDimensions, precision)
  const pixelSize = percentageSizeToPixel(signaturePosition, pageDimensions, precision)
  
  return {
    ...pixelPoint,
    ...pixelSize,
    pageNumber: signaturePosition.pageNumber
  }
}

/**
 * 完整签字位置：像素转百分比
 */
export function pixelPositionToSignature(
  pixelPosition: PixelPosition,
  recipientId: string,
  pageDimensions: PageDimensions,
  precision: number = COORDINATE_CONSTANTS.DEFAULT_PRECISION
): SignaturePosition {
  const percentagePoint = pixelToPercentage(pixelPosition, pageDimensions, precision)
  const percentageSize = pixelSizeToPercentage(pixelPosition, pageDimensions, precision)
  
  return {
    ...percentagePoint,
    ...percentageSize,
    pageNumber: pixelPosition.pageNumber,
    recipientId
  }
}

/**
 * 批量转换：百分比位置转像素位置
 */
export function batchSignaturePositionsToPixel(
  signaturePositions: SignaturePosition[],
  pageDimensionsMap: Map<number, PageDimensions>,
  precision: number = COORDINATE_CONSTANTS.DEFAULT_PRECISION
): PixelPosition[] {
  return signaturePositions.map(position => {
    const pageDimensions = pageDimensionsMap.get(position.pageNumber)
    if (!pageDimensions) {
      throw new Error(`页面尺寸信息不存在：页码 ${position.pageNumber}`)
    }
    return signaturePositionToPixel(position, pageDimensions, precision)
  })
}

/**
 * 批量转换：像素位置转百分比位置
 */
export function batchPixelPositionsToSignature(
  pixelPositions: PixelPosition[],
  recipientIds: string[],
  pageDimensionsMap: Map<number, PageDimensions>,
  precision: number = COORDINATE_CONSTANTS.DEFAULT_PRECISION
): SignaturePosition[] {
  if (pixelPositions.length !== recipientIds.length) {
    throw new Error('像素位置数量与收件人ID数量不匹配')
  }
  
  return pixelPositions.map((position, index) => {
    const pageDimensions = pageDimensionsMap.get(position.pageNumber)
    if (!pageDimensions) {
      throw new Error(`页面尺寸信息不存在：页码 ${position.pageNumber}`)
    }
    return pixelPositionToSignature(position, recipientIds[index], pageDimensions, precision)
  })
}

/**
 * 坐标系统转换 (支持不同的坐标系统)
 */
export interface CoordinateSystemConversion {
  fromCoordinateSystem: 'percentage' | 'pixel'
  toCoordinateSystem: 'percentage' | 'pixel'
  pageDimensions: PageDimensions
  precision?: number
}

export function convertCoordinateSystem<T extends CoordinatePoint & CoordinateSize>(
  position: T,
  conversion: CoordinateSystemConversion
): T {
  const precision = conversion.precision ?? COORDINATE_CONSTANTS.DEFAULT_PRECISION
  
  if (conversion.fromCoordinateSystem === conversion.toCoordinateSystem) {
    return position // 无需转换
  }
  
  if (conversion.fromCoordinateSystem === 'percentage' && conversion.toCoordinateSystem === 'pixel') {
    const pixelPoint = percentageToPixel(position, conversion.pageDimensions, precision)
    const pixelSize = percentageSizeToPixel(position, conversion.pageDimensions, precision)
    return { ...position, ...pixelPoint, ...pixelSize }
  }
  
  if (conversion.fromCoordinateSystem === 'pixel' && conversion.toCoordinateSystem === 'percentage') {
    const percentagePoint = pixelToPercentage(position, conversion.pageDimensions, precision)
    const percentageSize = pixelSizeToPercentage(position, conversion.pageDimensions, precision)
    return { ...position, ...percentagePoint, ...percentageSize }
  }
  
  throw new Error(`不支持的坐标系统转换: ${conversion.fromCoordinateSystem} -> ${conversion.toCoordinateSystem}`)
}

/**
 * 坐标缩放转换 (当PDF显示尺寸改变时)
 */
export function scaleCoordinates<T extends CoordinatePoint & CoordinateSize>(
  position: T,
  scaleX: number,
  scaleY: number,
  precision: number = COORDINATE_CONSTANTS.DEFAULT_PRECISION
): T {
  return {
    ...position,
    x: roundToPrecision(position.x * scaleX, precision),
    y: roundToPrecision(position.y * scaleY, precision),
    width: roundToPrecision(position.width * scaleX, precision),
    height: roundToPrecision(position.height * scaleY, precision)
  }
}

/**
 * 坐标偏移转换 (当PDF位置偏移时)
 */
export function offsetCoordinates<T extends CoordinatePoint>(
  position: T,
  offsetX: number,
  offsetY: number,
  precision: number = COORDINATE_CONSTANTS.DEFAULT_PRECISION
): T {
  return {
    ...position,
    x: roundToPrecision(position.x + offsetX, precision),
    y: roundToPrecision(position.y + offsetY, precision)
  }
}

/**
 * 坐标边界约束 (确保坐标在有效范围内)
 */
export function constrainCoordinates<T extends CoordinatePoint & CoordinateSize>(
  position: T,
  coordinateSystem: 'percentage' | 'pixel',
  pageDimensions?: PageDimensions
): T {
  if (coordinateSystem === 'percentage') {
    return {
      ...position,
      x: Math.max(0, Math.min(100, position.x)),
      y: Math.max(0, Math.min(100, position.y)),
      width: Math.max(0, Math.min(100 - position.x, position.width)),
      height: Math.max(0, Math.min(100 - position.y, position.height))
    }
  }
  
  if (coordinateSystem === 'pixel' && pageDimensions) {
    return {
      ...position,
      x: Math.max(0, Math.min(pageDimensions.width, position.x)),
      y: Math.max(0, Math.min(pageDimensions.height, position.y)),
      width: Math.max(0, Math.min(pageDimensions.width - position.x, position.width)),
      height: Math.max(0, Math.min(pageDimensions.height - position.y, position.height))
    }
  }
  
  throw new Error('像素坐标约束需要提供页面尺寸信息')
}

/**
 * 工具函数：四舍五入到指定精度
 */
function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision)
  return Math.round(value * factor) / factor
}

/**
 * 工具函数：创建页面尺寸映射
 */
export function createPageDimensionsMap(dimensions: PageDimensions[]): Map<number, PageDimensions> {
  const map = new Map<number, PageDimensions>()
  for (const dimension of dimensions) {
    map.set(dimension.pageNumber, dimension)
  }
  return map
}

/**
 * 工具函数：验证页面尺寸
 */
export function validatePageDimensions(dimensions: PageDimensions): boolean {
  return (
    typeof dimensions.pageNumber === 'number' &&
    dimensions.pageNumber > 0 &&
    typeof dimensions.width === 'number' &&
    dimensions.width > 0 &&
    typeof dimensions.height === 'number' &&
    dimensions.height > 0
  )
} 