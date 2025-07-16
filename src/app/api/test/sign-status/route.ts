import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

/**
 * GET /api/test/sign-status
 * 测试签字状态查询API的端到端功能
 * 
 * 测试范围：
 * 1. Token验证 (有效、无效、过期)
 * 2. 个人进度计算准确性
 * 3. 任务整体进度统计
 * 4. 时间线生成
 * 5. 状态聚合逻辑
 * 6. 边界情况处理
 */
export async function GET(request: NextRequest) {
  const testResults = []
  let testsPassed = 0
  let totalTests = 0

  console.log('\n=== 开始 Task 6.4 签字状态查询 测试 ===')

  try {
    // 测试准备：创建测试数据
    console.log('\n--- 准备测试数据 ---')

    // 1. 创建测试任务
    const testUserId = 'test_user_' + Date.now()
    const { data: testTask, error: taskError } = await supabase
      .from('signature_tasks')
      .insert({
        user_id: testUserId,
        title: 'Task 6.4 状态查询测试',
        description: '测试签字状态查询API功能',
        status: 'in_progress'
      })
      .select()
      .single()

    if (taskError || !testTask) {
      throw new Error(`测试任务创建失败: ${taskError?.message}`)
    }

    console.log('测试任务创建成功:', testTask.id)

    // 2. 创建测试文件
    const { data: testFile, error: fileError } = await supabase
      .from('signature_files')
      .insert({
        task_id: testTask.id,
        original_filename: 'status-test.pdf',
        display_name: '状态测试.pdf',
        original_file_url: 'https://example.com/status-test.pdf',
        file_size: 1024,
        file_order: 1
      })
      .select()
      .single()

    if (fileError || !testFile) {
      throw new Error(`测试文件创建失败: ${fileError?.message}`)
    }

    // 3. 创建测试收件人
    const recipients = []
    for (let i = 1; i <= 3; i++) {
      // 生成token
      const { data: token, error: tokenError } = await supabase
        .rpc('generate_recipient_token')

      if (tokenError) {
        throw new Error(`Token生成失败: ${tokenError.message}`)
      }

      const { data: recipient, error: recipientError } = await supabase
        .from('signature_recipients')
        .insert({
          task_id: testTask.id,
          name: `测试收件人${i}`,
          email: `test${i}@example.com`,
          token: token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: i === 1 ? 'signed' : 'pending'
        })
        .select()
        .single()

      if (recipientError) {
        throw new Error(`收件人${i}创建失败: ${recipientError.message}`)
      }

      recipients.push(recipient)
    }

    // 4. 创建签字位置
    const positions = []
    for (let i = 0; i < recipients.length; i++) {
      for (let j = 1; j <= 2; j++) {
        const { data: position, error: positionError } = await supabase
          .from('signature_positions')
          .insert({
            recipient_id: recipients[i].id,
            file_id: testFile.id,
            page_number: j,
            x_percent: 10.0 + i * 5.0,
            y_percent: 20.0 + j * 10.0,
            width_percent: 15.0,
            height_percent: 5.0,
            page_width: 595,
            page_height: 842,
            placeholder_text: `测试收件人${i+1} - 点击签字`,
            status: i === 0 ? 'signed' : 'pending', // 第一个收件人已签字
            signature_content: i === 0 ? `【测试收件人${i+1}】signed at【2025-07-15 10:${j}0:00】` : null,
            signed_at: i === 0 ? new Date().toISOString() : null
          })
          .select()
          .single()

        if (positionError) {
          throw new Error(`位置创建失败: ${positionError.message}`)
        }

        positions.push(position)
      }
    }

    console.log(`测试数据创建完成: ${recipients.length}个收件人, ${positions.length}个位置`)

    // --- 开始核心功能测试 ---

    // Test 1: 有效Token状态查询
    totalTests++
    console.log('\n--- Test 1: 有效Token状态查询 ---')
    try {
      const response = await fetch(`http://localhost:3000/api/sign/status?token=${recipients[1].token}`)
      const data = await response.json()

      if (response.ok && data.success && data.valid) {
        console.log('✅ Token验证成功')
        
        // 验证个人进度
        const personal = data.data.personal
        if (personal.recipient.name === '测试收件人2' && 
            personal.progress.total_positions === 2 &&
            personal.progress.signed_positions === 0 &&
            personal.progress.completion_percentage === 0) {
          console.log('✅ 个人进度计算正确')
        } else {
          throw new Error('个人进度计算错误')
        }

        // 验证任务整体进度
        const overview = data.data.task_overview
        if (overview.overall_progress.total_recipients === 3 &&
            overview.overall_progress.signed_recipients === 1 &&
            overview.overall_progress.total_positions === 6 &&
            overview.overall_progress.signed_positions === 2) {
          console.log('✅ 任务整体进度统计正确')
        } else {
          throw new Error('任务整体进度统计错误')
        }

        // 验证时间线
        if (data.data.timeline && data.data.timeline.length > 0) {
          console.log('✅ 时间线生成成功')
        } else {
          throw new Error('时间线生成失败')
        }

        // 验证元数据
        if (data.data.metadata.can_sign === true && 
            data.data.metadata.next_actions.length > 0) {
          console.log('✅ 元数据生成正确')
        } else {
          throw new Error('元数据生成错误')
        }

        testsPassed++
        testResults.push({
          test: 'Test 1: 有效Token状态查询',
          status: 'PASSED',
          details: '个人进度、整体统计、时间线、元数据全部正确'
        })
      } else {
        throw new Error(`状态查询失败: ${data.error}`)
      }
    } catch (error) {
      console.log('❌ Test 1 失败:', error)
      testResults.push({
        test: 'Test 1: 有效Token状态查询',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Test 2: 无效Token处理
    totalTests++
    console.log('\n--- Test 2: 无效Token处理 ---')
    try {
      const response = await fetch('http://localhost:3000/api/sign/status?token=invalid_token_123')
      const data = await response.json()

      if (response.status === 401 && !data.success && !data.valid) {
        console.log('✅ 无效Token正确拒绝')
        testsPassed++
        testResults.push({
          test: 'Test 2: 无效Token处理',
          status: 'PASSED',
          details: '无效Token正确返回401状态'
        })
      } else {
        throw new Error('无效Token应该被拒绝')
      }
    } catch (error) {
      console.log('❌ Test 2 失败:', error)
      testResults.push({
        test: 'Test 2: 无效Token处理',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Test 3: 缺失Token参数
    totalTests++
    console.log('\n--- Test 3: 缺失Token参数 ---')
    try {
      const response = await fetch('http://localhost:3000/api/sign/status')
      const data = await response.json()

      if (response.status === 400 && !data.success) {
        console.log('✅ 缺失Token正确处理')
        testsPassed++
        testResults.push({
          test: 'Test 3: 缺失Token参数',
          status: 'PASSED',
          details: '缺失Token参数正确返回400状态'
        })
      } else {
        throw new Error('缺失Token应该返回400错误')
      }
    } catch (error) {
      console.log('❌ Test 3 失败:', error)
      testResults.push({
        test: 'Test 3: 缺失Token参数',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Test 4: 已完成收件人状态查询
    totalTests++
    console.log('\n--- Test 4: 已完成收件人状态查询 ---')
    try {
      const response = await fetch(`http://localhost:3000/api/sign/status?token=${recipients[0].token}`)
      const data = await response.json()

      if (response.ok && data.success && data.valid) {
        const personal = data.data.personal
        
        if (personal.recipient.status === 'signed' &&
            personal.progress.is_all_signed === true &&
            personal.progress.completion_percentage === 100 &&
            data.data.metadata.can_sign === false) {
          console.log('✅ 已完成收件人状态正确')
          testsPassed++
          testResults.push({
            test: 'Test 4: 已完成收件人状态查询',
            status: 'PASSED',
            details: '已签字收件人的状态和进度计算正确'
          })
        } else {
          throw new Error('已完成收件人状态计算错误')
        }
      } else {
        throw new Error(`已完成收件人查询失败: ${data.error}`)
      }
    } catch (error) {
      console.log('❌ Test 4 失败:', error)
      testResults.push({
        test: 'Test 4: 已完成收件人状态查询',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Test 5: 进度百分比计算验证
    totalTests++
    console.log('\n--- Test 5: 进度百分比计算验证 ---')
    try {
      const response = await fetch(`http://localhost:3000/api/sign/status?token=${recipients[1].token}`)
      const data = await response.json()

      if (response.ok && data.success) {
        const overview = data.data.task_overview.overall_progress
        
        // 验证收件人百分比: 1/3 = 33%
        const expectedRecipientPercentage = Math.round((1/3) * 100)
        // 验证位置百分比: 2/6 = 33%
        const expectedPositionPercentage = Math.round((2/6) * 100)

        if (overview.recipient_completion_percentage === expectedRecipientPercentage &&
            overview.position_completion_percentage === expectedPositionPercentage) {
          console.log('✅ 进度百分比计算正确')
          console.log(`   收件人进度: ${overview.recipient_completion_percentage}%`)
          console.log(`   位置进度: ${overview.position_completion_percentage}%`)
          testsPassed++
          testResults.push({
            test: 'Test 5: 进度百分比计算验证',
            status: 'PASSED',
            details: `收件人: ${overview.recipient_completion_percentage}%, 位置: ${overview.position_completion_percentage}%`
          })
        } else {
          throw new Error(`百分比计算错误: 收件人${overview.recipient_completion_percentage}%, 位置${overview.position_completion_percentage}%`)
        }
      } else {
        throw new Error(`进度查询失败: ${data.error}`)
      }
    } catch (error) {
      console.log('❌ Test 5 失败:', error)
      testResults.push({
        test: 'Test 5: 进度百分比计算验证',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Test 6: 时间线排序验证
    totalTests++
    console.log('\n--- Test 6: 时间线排序验证 ---')
    try {
      const response = await fetch(`http://localhost:3000/api/sign/status?token=${recipients[0].token}`)
      const data = await response.json()

      if (response.ok && data.success) {
        const timeline = data.data.timeline
        
        if (timeline.length >= 2) {
          let isSorted = true
          for (let i = 1; i < timeline.length; i++) {
            if (new Date(timeline[i-1].timestamp) > new Date(timeline[i].timestamp)) {
              isSorted = false
              break
            }
          }

          if (isSorted) {
            console.log('✅ 时间线按时间正确排序')
            console.log(`   时间线事件数: ${timeline.length}`)
            testsPassed++
            testResults.push({
              test: 'Test 6: 时间线排序验证',
              status: 'PASSED',
              details: `时间线包含${timeline.length}个事件，时间排序正确`
            })
          } else {
            throw new Error('时间线排序错误')
          }
        } else {
          throw new Error('时间线事件数量不足')
        }
      } else {
        throw new Error(`时间线查询失败: ${data.error}`)
      }
    } catch (error) {
      console.log('❌ Test 6 失败:', error)
      testResults.push({
        test: 'Test 6: 时间线排序验证',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 清理测试数据
    console.log('\n--- 清理测试数据 ---')
    await supabase.from('signature_positions').delete().in('id', positions.map(p => p.id))
    await supabase.from('signature_recipients').delete().in('id', recipients.map(r => r.id))
    await supabase.from('signature_files').delete().eq('id', testFile.id)
    await supabase.from('signature_tasks').delete().eq('id', testTask.id)
    console.log('测试数据清理完成')

    // 生成测试报告
    const successRate = Math.round((testsPassed / totalTests) * 100)
    const testSummary = {
      task: 'Task 6.4: 签字状态查询API',
      total_tests: totalTests,
      passed: testsPassed,
      failed: totalTests - testsPassed,
      success_rate: successRate,
      status: testsPassed === totalTests ? 'ALL_PASSED' : 'SOME_FAILED',
      details: testResults
    }

    console.log(`\n=== Task 6.4 测试完成 ===`)
    console.log(`总测试数: ${totalTests}`)
    console.log(`通过: ${testsPassed}`)
    console.log(`失败: ${totalTests - testsPassed}`)
    console.log(`成功率: ${successRate}%`)

    return NextResponse.json({
      success: true,
      message: 'Task 6.4 签字状态查询测试完成',
      results: testSummary,
      test_status: testsPassed === totalTests ? '✅ 全部通过' : '❌ 部分失败'
    })

  } catch (error) {
    console.error('测试执行错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: '测试执行失败',
        details: error instanceof Error ? error.message : '未知错误',
        completed_tests: testResults
      },
      { status: 500 }
    )
  }
} 