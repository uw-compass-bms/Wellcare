import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase/client'
import { 
  validateSignaturePosition,
  detectBatchConflicts,
  type SignaturePosition,
  type PositionArea
} from '@/lib/coordinates'

/**
 * Task 5.2.6: 位置CRUD功能综合测试端点
 * POST /api/test/position-crud
 */
export async function POST(request: NextRequest) {
  try {
    // JWT认证
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const testResults: any = {
      summary: {},
      details: [],
      timestamp: new Date().toISOString()
    }

    let passedTests = 0
    let totalTests = 0

    // 辅助函数：添加测试结果
    const addTestResult = (testName: string, passed: boolean, details: any) => {
      totalTests++
      if (passed) passedTests++
      
      testResults.details.push({
        test: testName,
        passed,
        details
      })
    }

    // ========== 测试准备：创建测试数据 ==========
    
    // 创建测试任务
    const { data: testTask, error: taskError } = await supabase
      .from('signature_tasks')
      .insert({
        user_id: userId,
        title: 'Position CRUD Test Task',
        description: '用于测试位置CRUD功能的任务'
      })
      .select()
      .single()

    if (taskError || !testTask) {
      throw new Error(`创建测试任务失败: ${taskError?.message}`)
    }

    // 创建测试文件
    const { data: testFile, error: fileError } = await supabase
      .from('signature_files')
      .insert({
        task_id: testTask.id,
        original_filename: 'test-document.pdf',
        display_name: '测试文档',
        file_size: 1024000,
        original_file_url: 'https://example.com/test.pdf',
        file_order: 1
      })
      .select()
      .single()

    if (fileError || !testFile) {
      throw new Error(`创建测试文件失败: ${fileError?.message}`)
    }

    // 创建测试收件人
    const { data: testRecipient, error: recipientError } = await supabase
      .from('signature_recipients')
      .insert({
        task_id: testTask.id,
        name: '测试收件人',
        email: 'test@example.com',
        token: 'test_token_' + Date.now(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (recipientError || !testRecipient) {
      throw new Error(`创建测试收件人失败: ${recipientError?.message}`)
    }

    // ========== 测试1: 坐标验证功能 ==========
    
    try {
      const validPosition: SignaturePosition = {
        x: 10,
        y: 20,
        width: 15,
        height: 5,
        pageNumber: 1,
        recipientId: testRecipient.id
      }

      const validation = validateSignaturePosition(validPosition)
      addTestResult('坐标验证 - 有效坐标', validation.isValid, {
        position: validPosition,
        validation
      })

      const invalidPosition: SignaturePosition = {
        x: -5,  // 无效：负数
        y: 110, // 无效：超出100%
        width: 0, // 无效：零宽度
        height: 50, // 无效：超出最大高度
        pageNumber: 0, // 无效：页码为0
        recipientId: testRecipient.id
      }

      const invalidValidation = validateSignaturePosition(invalidPosition)
      addTestResult('坐标验证 - 无效坐标', !invalidValidation.isValid, {
        position: invalidPosition,
        validation: invalidValidation
      })

    } catch (error) {
      addTestResult('坐标验证', false, { error: error instanceof Error ? error.message : String(error) })
    }

    // ========== 测试2: 创建签字位置 ==========
    
    let createdPosition: any = null
    try {
      const { data: newPosition, error: createError } = await supabase
        .from('signature_positions')
        .insert({
          recipient_id: testRecipient.id,
          file_id: testFile.id,
          page_number: 1,
          x_percent: 10,
          y_percent: 20,
          width_percent: 15,
          height_percent: 5,
          x_pixel: 59,    // 10% of 595
          y_pixel: 168,   // 20% of 842
          width_pixel: 89, // 15% of 595
          height_pixel: 42, // 5% of 842
          page_width: 595,
          page_height: 842,
          placeholder_text: '点击签字'
        })
        .select()
        .single()

      createdPosition = newPosition
      addTestResult('创建签字位置', !createError && !!newPosition, {
        position: newPosition,
        error: createError?.message
      })

    } catch (error) {
      addTestResult('创建签字位置', false, { error: error instanceof Error ? error.message : String(error) })
    }

    // ========== 测试3: 冲突检测 ==========
    
    try {
      if (createdPosition) {
        // 创建冲突位置
        const conflictingArea: PositionArea = {
          x: 15,    // 与创建的位置重叠
          y: 22,    // 与创建的位置重叠
          width: 10,
          height: 3
        }

        const existingAreas: PositionArea[] = [{
          id: createdPosition.id,
          x: createdPosition.x_percent,
          y: createdPosition.y_percent,
          width: createdPosition.width_percent,
          height: createdPosition.height_percent
        }]

        const conflictResult = detectBatchConflicts(conflictingArea, existingAreas, 0.20)
        addTestResult('冲突检测 - 发现冲突', conflictResult.hasConflict, {
          newPosition: conflictingArea,
          existingPositions: existingAreas,
          conflictResult
        })

        // 测试无冲突位置
        const nonConflictingArea: PositionArea = {
          x: 50,   // 远离现有位置
          y: 60,   // 远离现有位置
          width: 10,
          height: 5
        }

        const noConflictResult = detectBatchConflicts(nonConflictingArea, existingAreas, 0.20)
        addTestResult('冲突检测 - 无冲突', !noConflictResult.hasConflict, {
          newPosition: nonConflictingArea,
          existingPositions: existingAreas,
          conflictResult: noConflictResult
        })
      }

    } catch (error) {
      addTestResult('冲突检测', false, { error: error instanceof Error ? error.message : String(error) })
    }

    // ========== 测试4: 获取签字位置 ==========
    
    try {
      const { data: positions, error: fetchError } = await supabase
        .from('signature_positions')
        .select(`
          *,
          signature_files!inner(id, original_filename, display_name)
        `)
        .eq('recipient_id', testRecipient.id)

      addTestResult('获取签字位置', !fetchError && positions && positions.length > 0, {
        positionsCount: positions?.length || 0,
        positions,
        error: fetchError?.message
      })

    } catch (error) {
      addTestResult('获取签字位置', false, { error: error instanceof Error ? error.message : String(error) })
    }

    // ========== 测试5: 更新签字位置 ==========
    
    try {
      if (createdPosition) {
        const { data: updatedPosition, error: updateError } = await supabase
          .from('signature_positions')
          .update({
            x_percent: 30,
            y_percent: 40,
            placeholder_text: '请在此签字'
          })
          .eq('id', createdPosition.id)
          .select()
          .single()

        addTestResult('更新签字位置', !updateError && !!updatedPosition, {
          originalPosition: createdPosition,
          updatedPosition,
          error: updateError?.message
        })
      }

    } catch (error) {
      addTestResult('更新签字位置', false, { error: error instanceof Error ? error.message : String(error) })
    }

    // ========== 测试6: 删除签字位置 ==========
    
    try {
      if (createdPosition) {
        const { error: deleteError } = await supabase
          .from('signature_positions')
          .delete()
          .eq('id', createdPosition.id)

        addTestResult('删除签字位置', !deleteError, {
          deletedPositionId: createdPosition.id,
          error: deleteError?.message
        })

        // 验证删除成功
        const { data: deletedCheck } = await supabase
          .from('signature_positions')
          .select('id')
          .eq('id', createdPosition.id)
          .single()

        addTestResult('验证删除成功', !deletedCheck, {
          shouldBeNull: true,
          actualResult: deletedCheck
        })
      }

    } catch (error) {
      addTestResult('删除签字位置', false, { error: error instanceof Error ? error.message : String(error) })
    }

    // ========== 清理测试数据 ==========
    
    try {
      // 删除测试数据（级联删除）
      await supabase.from('signature_tasks').delete().eq('id', testTask.id)
      addTestResult('清理测试数据', true, { message: '测试数据清理完成' })
    } catch (error) {
      addTestResult('清理测试数据', false, { error: error instanceof Error ? error.message : String(error) })
    }

    // ========== 生成测试摘要 ==========
    
    testResults.summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) + '%' : '0%',
      status: passedTests === totalTests ? 'ALL_PASSED' : 'SOME_FAILED'
    }

    const responseStatus = passedTests === totalTests ? 200 : 400

    return NextResponse.json({
      success: passedTests === totalTests,
      message: `位置CRUD测试完成: ${passedTests}/${totalTests} 通过`,
      data: testResults
    }, { status: responseStatus })

  } catch (error) {
    console.error('位置CRUD测试错误:', error)
    return NextResponse.json(
      { 
        error: '测试执行失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
} 