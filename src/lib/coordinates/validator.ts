/**
 * Step 5.1.2: 坐标验证函数
 * 提供签字位置坐标的验证逻辑
 */

import {
  CoordinatePoint,
  CoordinateSize,
  SignaturePosition,
  CoordinateValidationResult,
  COORDINATE_CONSTANTS,
  CoordinateErrorType,
  COORDINATE_ERROR_MESSAGES
} from './types'

/**
 * 验证坐标点 (x, y)
 */
export function validateCoordinatePoint(point: Partial<CoordinatePoint>): CoordinateValidationResult {
  const errors: string[] = []
  
  // 检查必要字段
  if (typeof point.x !== 'number') {
    errors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.MISSING_REQUIRED_FIELD] + ': x坐标')
  }
  
  if (typeof point.y !== 'number') {
    errors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.MISSING_REQUIRED_FIELD] + ': y坐标')
  }
  
  // 如果字段缺失，直接返回
  if (errors.length > 0) {
    return { isValid: false, errors }
  }
  
  // 验证X坐标范围
  if (point.x! < COORDINATE_CONSTANTS.MIN_PERCENTAGE || point.x! > COORDINATE_CONSTANTS.MAX_PERCENTAGE) {
    errors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.INVALID_X])
  }
  
  // 验证Y坐标范围
  if (point.y! < COORDINATE_CONSTANTS.MIN_PERCENTAGE || point.y! > COORDINATE_CONSTANTS.MAX_PERCENTAGE) {
    errors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.INVALID_Y])
  }
  
  // 检查精度 (最多4位小数)
  const xPrecision = getDecimalPlaces(point.x!)
  const yPrecision = getDecimalPlaces(point.y!)
  
  if (xPrecision > COORDINATE_CONSTANTS.MAX_PRECISION || yPrecision > COORDINATE_CONSTANTS.MAX_PRECISION) {
    errors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.PRECISION_ERROR])
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 验证坐标尺寸 (width, height)
 */
export function validateCoordinateSize(size: Partial<CoordinateSize>): CoordinateValidationResult {
  const errors: string[] = []
  
  // 检查必要字段
  if (typeof size.width !== 'number') {
    errors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.MISSING_REQUIRED_FIELD] + ': width')
  }
  
  if (typeof size.height !== 'number') {
    errors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.MISSING_REQUIRED_FIELD] + ': height')
  }
  
  // 如果字段缺失，直接返回
  if (errors.length > 0) {
    return { isValid: false, errors }
  }
  
  // 验证宽度范围
  if (size.width! < COORDINATE_CONSTANTS.MIN_SIGNATURE_WIDTH || 
      size.width! > COORDINATE_CONSTANTS.MAX_SIGNATURE_WIDTH) {
    errors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.INVALID_WIDTH] + 
                ` (${COORDINATE_CONSTANTS.MIN_SIGNATURE_WIDTH}-${COORDINATE_CONSTANTS.MAX_SIGNATURE_WIDTH}%)`)
  }
  
  // 验证高度范围
  if (size.height! < COORDINATE_CONSTANTS.MIN_SIGNATURE_HEIGHT || 
      size.height! > COORDINATE_CONSTANTS.MAX_SIGNATURE_HEIGHT) {
    errors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.INVALID_HEIGHT] + 
                ` (${COORDINATE_CONSTANTS.MIN_SIGNATURE_HEIGHT}-${COORDINATE_CONSTANTS.MAX_SIGNATURE_HEIGHT}%)`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 验证页码
 */
export function validatePageNumber(pageNumber: any): CoordinateValidationResult {
  const errors: string[] = []
  
  // 检查必要字段
  if (typeof pageNumber !== 'number') {
    errors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.MISSING_REQUIRED_FIELD] + ': pageNumber')
    return { isValid: false, errors }
  }
  
  // 验证页码范围
  if (pageNumber < COORDINATE_CONSTANTS.MIN_PAGE_NUMBER || 
      pageNumber > COORDINATE_CONSTANTS.MAX_PAGE_NUMBER) {
    errors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.INVALID_PAGE_NUMBER] + 
                ` (${COORDINATE_CONSTANTS.MIN_PAGE_NUMBER}-${COORDINATE_CONSTANTS.MAX_PAGE_NUMBER})`)
  }
  
  // 检查是否为整数
  if (!Number.isInteger(pageNumber)) {
    errors.push('页码必须为整数')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 验证签字位置边界 (确保签字框不超出页面)
 */
export function validateSignatureBounds(position: CoordinatePoint & CoordinateSize): CoordinateValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // 检查右边界
  if (position.x + position.width > COORDINATE_CONSTANTS.MAX_PERCENTAGE) {
    errors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.OUT_OF_BOUNDS] + ': 右边界')
  }
  
  // 检查下边界
  if (position.y + position.height > COORDINATE_CONSTANTS.MAX_PERCENTAGE) {
    errors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.OUT_OF_BOUNDS] + ': 下边界')
  }
  
  // 警告：如果位置过于接近边界
  const rightEdge = position.x + position.width
  const bottomEdge = position.y + position.height
  
  if (rightEdge > 95 && rightEdge <= 100) {
    warnings.push('签字位置过于接近右边界，可能影响显示')
  }
  
  if (bottomEdge > 95 && bottomEdge <= 100) {
    warnings.push('签字位置过于接近下边界，可能影响显示')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * 验证完整的签字位置
 */
export function validateSignaturePosition(position: Partial<SignaturePosition>): CoordinateValidationResult {
  const allErrors: string[] = []
  const allWarnings: string[] = []
  
  // 验证坐标点
  const pointValidation = validateCoordinatePoint(position)
  allErrors.push(...pointValidation.errors)
  
  // 验证尺寸
  const sizeValidation = validateCoordinateSize(position)
  allErrors.push(...sizeValidation.errors)
  
  // 验证页码
  const pageValidation = validatePageNumber(position.pageNumber)
  allErrors.push(...pageValidation.errors)
  
  // 验证收件人ID
  if (!position.recipientId || typeof position.recipientId !== 'string' || position.recipientId.trim() === '') {
    allErrors.push(COORDINATE_ERROR_MESSAGES[CoordinateErrorType.MISSING_REQUIRED_FIELD] + ': recipientId')
  }
  
  // 如果基础验证通过，检查边界
  if (allErrors.length === 0) {
    const boundsValidation = validateSignatureBounds(position as CoordinatePoint & CoordinateSize)
    allErrors.push(...boundsValidation.errors)
    if (boundsValidation.warnings) {
      allWarnings.push(...boundsValidation.warnings)
    }
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings.length > 0 ? allWarnings : undefined
  }
}

/**
 * 批量验证签字位置 (检查重叠等)
 */
export function validateMultipleSignaturePositions(positions: SignaturePosition[]): CoordinateValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // 验证每个位置
  for (let i = 0; i < positions.length; i++) {
    const validation = validateSignaturePosition(positions[i])
    if (!validation.isValid) {
      errors.push(`位置 ${i + 1}: ${validation.errors.join(', ')}`)
    }
    if (validation.warnings) {
      warnings.push(`位置 ${i + 1}: ${validation.warnings.join(', ')}`)
    }
  }
  
  // 检查重叠 (同一页面上的位置)
  const positionsByPage = groupPositionsByPage(positions)
  positionsByPage.forEach((pagePositions, pageNumber) => {
    const overlaps = findOverlappingPositions(pagePositions)
    if (overlaps.length > 0) {
      errors.push(`第${pageNumber}页存在重叠的签字位置`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * 工具函数：获取小数位数
 */
function getDecimalPlaces(num: number): number {
  const str = num.toString()
  if (str.indexOf('.') !== -1) {
    return str.split('.')[1].length
  }
  return 0
}

/**
 * 工具函数：按页面分组签字位置
 */
function groupPositionsByPage(positions: SignaturePosition[]): Map<number, SignaturePosition[]> {
  const groups = new Map<number, SignaturePosition[]>()
  
  for (const position of positions) {
    const pageNumber = position.pageNumber
    if (!groups.has(pageNumber)) {
      groups.set(pageNumber, [])
    }
    groups.get(pageNumber)!.push(position)
  }
  
  return groups
}

/**
 * 工具函数：查找重叠的签字位置
 */
function findOverlappingPositions(positions: SignaturePosition[]): Array<[number, number]> {
  const overlaps: Array<[number, number]> = []
  
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      if (isPositionOverlapping(positions[i], positions[j])) {
        overlaps.push([i, j])
      }
    }
  }
  
  return overlaps
}

/**
 * 工具函数：检查两个位置是否重叠
 */
function isPositionOverlapping(pos1: CoordinatePoint & CoordinateSize, pos2: CoordinatePoint & CoordinateSize): boolean {
  return !(
    pos1.x + pos1.width <= pos2.x ||    // pos1在pos2左边
    pos2.x + pos2.width <= pos1.x ||    // pos2在pos1左边
    pos1.y + pos1.height <= pos2.y ||   // pos1在pos2上面
    pos2.y + pos2.height <= pos1.y      // pos2在pos1上面
  )
} 