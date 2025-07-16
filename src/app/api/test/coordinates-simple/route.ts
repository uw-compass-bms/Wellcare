import { NextResponse } from 'next/server'
import { 
  validateSignaturePosition,
  detectBatchConflicts,
  calculateOverlapArea,
  percentageToPixel,
  percentageSizeToPixel,
  type SignaturePosition,
  type PositionArea
} from '@/lib/coordinates'

/**
 * 简单的坐标系统功能测试 - 无需认证
 * GET /api/test/coordinates-simple
 */
export async function GET() {
  try {
    const testResults: any = {
      summary: {},
      tests: [],
      timestamp: new Date().toISOString()
    }

    let passedTests = 0
    let totalTests = 0

    // 辅助函数：添加测试结果
    const addTest = (name: string, passed: boolean, details: any) => {
      totalTests++
      if (passed) passedTests++
      testResults.tests.push({ name, passed, details })
    }

    // 测试数据
    const testPosition1: SignaturePosition = {
      x: 10,
      y: 20,
      width: 15,
      height: 5,
      pageNumber: 1,
      recipientId: 'test-recipient-1'
    }

    const testPosition2: PositionArea = {
      x: 15,
      y: 22,
      width: 10,
      height: 3
    }

    const testPageDimensions = {
      width: 595,
      height: 842,
      pageNumber: 1
    }

    // 测试1: 坐标验证 - 有效坐标
    try {
      const validation = validateSignaturePosition(testPosition1)
      addTest('坐标验证-有效坐标', validation.isValid, {
        position: testPosition1,
        validation
      })
    } catch (error) {
      addTest('坐标验证-有效坐标', false, { 
        error: error instanceof Error ? error.message : String(error) 
      })
    }

    // 测试2: 坐标验证 - 无效坐标
    try {
      const invalidPosition: SignaturePosition = {
        x: -5,
        y: 110,
        width: 0,
        height: 50,
        pageNumber: 0,
        recipientId: 'test'
      }
      const validation = validateSignaturePosition(invalidPosition)
      addTest('坐标验证-无效坐标', !validation.isValid, {
        position: invalidPosition,
        validation
      })
    } catch (error) {
      addTest('坐标验证-无效坐标', false, { 
        error: error instanceof Error ? error.message : String(error) 
      })
    }

    // 测试3: 坐标转换
    try {
      const pixelPoint = percentageToPixel(
        { x: testPosition1.x, y: testPosition1.y },
        testPageDimensions
      )
      const pixelSize = percentageSizeToPixel(
        { width: testPosition1.width, height: testPosition1.height },
        testPageDimensions
      )
      
      const expectedX = (testPosition1.x / 100) * testPageDimensions.width
      const expectedY = (testPosition1.y / 100) * testPageDimensions.height
      
      addTest('坐标转换', 
        Math.abs(pixelPoint.x - expectedX) < 1 && Math.abs(pixelPoint.y - expectedY) < 1,
        {
          input: { x: testPosition1.x, y: testPosition1.y },
          output: pixelPoint,
          expected: { x: expectedX, y: expectedY },
          size: { input: { width: testPosition1.width, height: testPosition1.height }, output: pixelSize }
        }
      )
    } catch (error) {
      addTest('坐标转换', false, { 
        error: error instanceof Error ? error.message : String(error) 
      })
    }

    // 测试4: 重叠计算
    try {
      const overlapArea = calculateOverlapArea(testPosition1, testPosition2)
      
      // 手动计算期望的重叠面积
      const overlapLeft = Math.max(testPosition1.x, testPosition2.x)
      const overlapRight = Math.min(testPosition1.x + testPosition1.width, testPosition2.x + testPosition2.width)
      const overlapTop = Math.max(testPosition1.y, testPosition2.y)
      const overlapBottom = Math.min(testPosition1.y + testPosition1.height, testPosition2.y + testPosition2.height)
      const expectedOverlap = (overlapRight - overlapLeft) * (overlapBottom - overlapTop)
      
      addTest('重叠面积计算', 
        Math.abs(overlapArea - expectedOverlap) < 0.01,
        {
          position1: testPosition1,
          position2: testPosition2,
          calculatedOverlap: overlapArea,
          expectedOverlap,
          bounds: { overlapLeft, overlapRight, overlapTop, overlapBottom }
        }
      )
    } catch (error) {
      addTest('重叠面积计算', false, { 
        error: error instanceof Error ? error.message : String(error) 
      })
    }

    // 测试5: 冲突检测 - 有冲突
    try {
      const existingPositions = [testPosition1]
      const conflictResult = detectBatchConflicts(testPosition2, existingPositions, 0.20)
      
      addTest('冲突检测-有冲突', conflictResult.hasConflict, {
        newPosition: testPosition2,
        existingPositions,
        conflictResult
      })
    } catch (error) {
      addTest('冲突检测-有冲突', false, { 
        error: error instanceof Error ? error.message : String(error) 
      })
    }

    // 测试6: 冲突检测 - 无冲突
    try {
      const nonConflictingPosition: PositionArea = {
        x: 50,
        y: 60,
        width: 10,
        height: 5
      }
      const existingPositions = [testPosition1]
      const conflictResult = detectBatchConflicts(nonConflictingPosition, existingPositions, 0.20)
      
      addTest('冲突检测-无冲突', !conflictResult.hasConflict, {
        newPosition: nonConflictingPosition,
        existingPositions,
        conflictResult
      })
    } catch (error) {
      addTest('冲突检测-无冲突', false, { 
        error: error instanceof Error ? error.message : String(error) 
      })
    }

    // 生成测试摘要
    testResults.summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) + '%' : '0%',
      status: passedTests === totalTests ? '✅ 全部通过' : '⚠️ 部分失败'
    }

    return NextResponse.json({
      success: passedTests === totalTests,
      message: `坐标系统测试完成: ${passedTests}/${totalTests} 通过`,
      data: testResults
    })

  } catch (error) {
    console.error('坐标系统测试错误:', error)
    return NextResponse.json({
      success: false,
      error: '测试执行失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 