/**
 * Task 5.2.5: 签字位置冲突检测工具
 * 提供位置重叠检测和冲突分析功能
 */

import { CoordinatePoint, CoordinateSize, SignaturePosition } from './types'

// 冲突检测结果
export interface ConflictDetectionResult {
  hasConflict: boolean
  conflicts: ConflictInfo[]
  message?: string
}

// 冲突信息
export interface ConflictInfo {
  conflictingPositionId?: string
  overlapArea: number
  overlapPercentage: number
  overlapThreshold: number
  severity: 'low' | 'medium' | 'high'
  details: string
}

// 位置区域信息
export interface PositionArea extends CoordinatePoint, CoordinateSize {
  id?: string
  recipientId?: string
}

/**
 * 计算两个位置的重叠区域
 */
export function calculateOverlapArea(
  position1: PositionArea,
  position2: PositionArea
): number {
  const overlapLeft = Math.max(position1.x, position2.x)
  const overlapRight = Math.min(position1.x + position1.width, position2.x + position2.width)
  const overlapTop = Math.max(position1.y, position2.y)
  const overlapBottom = Math.min(position1.y + position1.height, position2.y + position2.height)

  // 如果没有重叠，返回0
  if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) {
    return 0
  }

  return (overlapRight - overlapLeft) * (overlapBottom - overlapTop)
}

/**
 * 检测两个位置是否冲突
 */
export function detectPositionConflict(
  currentPosition: PositionArea,
  existingPosition: PositionArea,
  overlapThreshold: number = 0.20
): ConflictInfo | null {
  const overlapArea = calculateOverlapArea(currentPosition, existingPosition)
  
  if (overlapArea === 0) {
    return null
  }

  const currentArea = currentPosition.width * currentPosition.height
  const existingArea = existingPosition.width * existingPosition.height
  const minArea = Math.min(currentArea, existingArea)
  
  const overlapPercentage = overlapArea / minArea
  
  // 如果重叠百分比超过阈值，则认为冲突
  if (overlapPercentage > overlapThreshold) {
    let severity: 'low' | 'medium' | 'high' = 'low'
    if (overlapPercentage > 0.5) {
      severity = 'high'
    } else if (overlapPercentage > 0.35) {
      severity = 'medium'
    }

    return {
      conflictingPositionId: existingPosition.id,
      overlapArea,
      overlapPercentage,
      overlapThreshold,
      severity,
      details: `重叠面积: ${(overlapPercentage * 100).toFixed(1)}% (阈值: ${(overlapThreshold * 100).toFixed(1)}%)`
    }
  }

  return null
}

/**
 * 批量检测位置冲突
 */
export function detectBatchConflicts(
  newPosition: PositionArea,
  existingPositions: PositionArea[],
  overlapThreshold: number = 0.20
): ConflictDetectionResult {
  const conflicts: ConflictInfo[] = []

  for (const existingPosition of existingPositions) {
    // 跳过相同的位置
    if (newPosition.id && newPosition.id === existingPosition.id) {
      continue
    }

    const conflict = detectPositionConflict(newPosition, existingPosition, overlapThreshold)
    if (conflict) {
      conflicts.push(conflict)
    }
  }

  const hasConflict = conflicts.length > 0
  let message = ''

  if (hasConflict) {
    const highSeverityCount = conflicts.filter(c => c.severity === 'high').length
    const mediumSeverityCount = conflicts.filter(c => c.severity === 'medium').length
    
    if (highSeverityCount > 0) {
      message = `检测到 ${highSeverityCount} 个严重冲突`
    } else if (mediumSeverityCount > 0) {
      message = `检测到 ${mediumSeverityCount} 个中等冲突`
    } else {
      message = `检测到 ${conflicts.length} 个轻微冲突`
    }
  } else {
    message = '未检测到位置冲突'
  }

  return {
    hasConflict,
    conflicts,
    message
  }
}

/**
 * 检测多个新位置之间的冲突
 */
export function detectInternalConflicts(
  positions: PositionArea[],
  overlapThreshold: number = 0.20
): ConflictDetectionResult {
  const conflicts: ConflictInfo[] = []

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const conflict = detectPositionConflict(positions[i], positions[j], overlapThreshold)
      if (conflict) {
        conflicts.push({
          ...conflict,
          details: `位置 ${i + 1} 与位置 ${j + 1} 冲突: ${conflict.details}`
        })
      }
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    message: conflicts.length > 0 
      ? `检测到 ${conflicts.length} 个内部位置冲突`
      : '位置间无冲突'
  }
}

/**
 * 获取推荐的签字位置
 * 基于现有位置，推荐无冲突的新位置区域
 */
export function getSuggestedPositions(
  existingPositions: PositionArea[],
  pageNumber: number,
  desiredSize: CoordinateSize = { width: 15, height: 5 },
  gridSize: number = 5
): PositionArea[] {
  const suggestions: PositionArea[] = []
  
  // 创建网格搜索
  for (let x = 0; x <= 100 - desiredSize.width; x += gridSize) {
    for (let y = 0; y <= 100 - desiredSize.height; y += gridSize) {
      const candidate: PositionArea = {
        x,
        y,
        width: desiredSize.width,
        height: desiredSize.height
      }

      // 检查是否与现有位置冲突
      const conflictResult = detectBatchConflicts(candidate, existingPositions, 0.1)
      
      if (!conflictResult.hasConflict) {
        suggestions.push(candidate)
        
        // 限制推荐数量
        if (suggestions.length >= 10) {
          break
        }
      }
    }
    
    if (suggestions.length >= 10) {
      break
    }
  }

  return suggestions
}

/**
 * 优化位置布局
 * 调整现有位置以减少冲突
 */
export function optimizePositionLayout(
  positions: PositionArea[],
  pageNumber: number,
  maxIterations: number = 10
): PositionArea[] {
  const optimizedPositions = [...positions]
  let iteration = 0

  while (iteration < maxIterations) {
    const conflicts = detectInternalConflicts(optimizedPositions)
    
    if (!conflicts.hasConflict) {
      break
    }

    // 简单的优化策略：将冲突的位置向右下方移动
    for (let i = 0; i < optimizedPositions.length; i++) {
      const position = optimizedPositions[i]
      const otherPositions = optimizedPositions.filter((_, index) => index !== i)
      const conflictResult = detectBatchConflicts(position, otherPositions)
      
      if (conflictResult.hasConflict) {
        // 尝试向右移动
        let newX = position.x + 5
        let newY = position.y
        
        if (newX + position.width > 100) {
          // 换行
          newX = 0
          newY = position.y + 10
          
          if (newY + position.height > 100) {
            // 无法优化，保持原位置
            continue
          }
        }

        optimizedPositions[i] = {
          ...position,
          x: newX,
          y: newY
        }
      }
    }

    iteration++
  }

  return optimizedPositions
} 