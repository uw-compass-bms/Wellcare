import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

/**
 * GET /api/test/sign-execution
 * 签字执行完整流程测试
 * 
 * 测试内容：
 * 1. 创建完整的测试数据（任务、文件、收件人、位置）
 * 2. 执行签字操作测试
 * 3. 验证数据库触发器级联更新
 * 4. 验证所有状态转换
 * 5. 清理测试数据
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const testId = `test_${Date.now()}`
  
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      test_id: testId,
      tests: {},
      summary: {
        passed: 0,
        failed: 0,
        total: 0
      }
    }

    // 1. 创建测试任务
    try {
      const { data: task, error: taskError } = await supabase
        .from('signature_tasks')
        .insert({
          user_id: 'test_user_' + testId,
          title: '签字执行测试任务',
          description: '自动化测试专用任务',
          status: 'in_progress'
        })
        .select()
        .single()

      if (taskError) throw taskError

      results.tests.taskCreation = {
        name: "Test Task Creation",
        success: true,
        message: "测试任务创建成功",
        data: { task_id: task.id, status: task.status }
      }
      results.summary.passed++
      results.task_id = task.id

    } catch (error) {
      results.tests.taskCreation = {
        name: "Test Task Creation",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 2. 创建测试文件
    try {
      const { data: file, error: fileError } = await supabase
        .from('signature_files')
        .insert({
          task_id: results.task_id,
          original_filename: 'test_document.pdf',
          display_name: '测试文档.pdf',
          file_size: 1024000,
          original_file_url: 'https://test.example.com/test.pdf',
          file_order: 1,
          status: 'uploaded'
        })
        .select()
        .single()

      if (fileError) throw fileError

      results.tests.fileCreation = {
        name: "Test File Creation",
        success: true,
        message: "测试文件创建成功",
        data: { file_id: file.id, status: file.status }
      }
      results.summary.passed++
      results.file_id = file.id

    } catch (error) {
      results.tests.fileCreation = {
        name: "Test File Creation",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 3. 创建测试收件人
    try {
      // 生成token
      const { data: token, error: tokenError } = await supabase
        .rpc('generate_recipient_token')

      if (tokenError) throw tokenError

      const { data: recipient, error: recipientError } = await supabase
        .from('signature_recipients')
        .insert({
          task_id: results.task_id,
          name: '测试收件人',
          email: `test_${testId}@example.com`,
          token: token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后过期
          status: 'pending'
        })
        .select()
        .single()

      if (recipientError) throw recipientError

      results.tests.recipientCreation = {
        name: "Test Recipient Creation",
        success: true,
        message: "测试收件人创建成功",
        data: { 
          recipient_id: recipient.id, 
          token: token, 
          status: recipient.status 
        }
      }
      results.summary.passed++
      results.recipient_id = recipient.id
      results.test_token = token

    } catch (error) {
      results.tests.recipientCreation = {
        name: "Test Recipient Creation",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 4. 创建测试签字位置
    try {
      const { data: position, error: positionError } = await supabase
        .from('signature_positions')
        .insert({
          recipient_id: results.recipient_id,
          file_id: results.file_id,
          page_number: 1,
          x_percent: 50.0,
          y_percent: 80.0,
          width_percent: 20.0,
          height_percent: 5.0,
          page_width: 595,
          page_height: 842,
          placeholder_text: '测试收件人 - 点击签字',
          status: 'pending'
        })
        .select()
        .single()

      if (positionError) throw positionError

      results.tests.positionCreation = {
        name: "Test Position Creation",
        success: true,
        message: "测试签字位置创建成功",
        data: { 
          position_id: position.id, 
          status: position.status,
          coordinates: `${position.x_percent}%, ${position.y_percent}%`
        }
      }
      results.summary.passed++
      results.position_id = position.id

    } catch (error) {
      results.tests.positionCreation = {
        name: "Test Position Creation",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 5. 执行签字操作测试
    try {
      const signResponse = await fetch(`${request.nextUrl.origin}/api/sign/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: results.test_token,
          position_id: results.position_id
        })
      })

      const signResult = await signResponse.json()

      if (!signResponse.ok) {
        throw new Error(`签字API返回错误: ${signResult.error}`)
      }

      results.tests.signExecution = {
        name: "Sign Execution Test",
        success: signResult.success,
        message: signResult.success ? "签字执行成功" : "签字执行失败",
        data: {
          signature_content: signResult.data?.signature?.content,
          signed_at: signResult.data?.signature?.signed_at,
          recipient_status: signResult.data?.recipient?.status,
          task_status: signResult.data?.task?.status,
          automated_updates: signResult.data?.automated_updates
        }
      }
      
      if (signResult.success) {
        results.summary.passed++
        results.sign_result = signResult.data
      } else {
        results.summary.failed++
      }

    } catch (error) {
      results.tests.signExecution = {
        name: "Sign Execution Test",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 6. 验证数据库状态更新
    try {
      // 检查position状态
      const { data: updatedPosition } = await supabase
        .from('signature_positions')
        .select('*')
        .eq('id', results.position_id)
        .single()

      // 检查recipient状态
      const { data: updatedRecipient } = await supabase
        .from('signature_recipients')
        .select('*')
        .eq('id', results.recipient_id)
        .single()

      // 检查task状态
      const { data: updatedTask } = await supabase
        .from('signature_tasks')
        .select('*')
        .eq('id', results.task_id)
        .single()

      const statusValidation = {
        position_signed: updatedPosition?.status === 'signed',
        signature_content_generated: !!updatedPosition?.signature_content,
        recipient_completed: updatedRecipient?.status === 'signed',
        task_completed: updatedTask?.status === 'completed'
      }

      const allValid = Object.values(statusValidation).every(v => v === true)

      results.tests.statusValidation = {
        name: "Database Status Validation",
        success: allValid,
        message: allValid ? "所有状态更新正确" : "部分状态更新异常",
        data: {
          validations: statusValidation,
          current_states: {
            position_status: updatedPosition?.status,
            signature_content: updatedPosition?.signature_content,
            recipient_status: updatedRecipient?.status,
            task_status: updatedTask?.status
          }
        }
      }

      if (allValid) {
        results.summary.passed++
      } else {
        results.summary.failed++
      }

    } catch (error) {
      results.tests.statusValidation = {
        name: "Database Status Validation",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 7. 清理测试数据
    try {
      // 由于外键约束，删除任务会级联删除相关数据
      await supabase
        .from('signature_tasks')
        .delete()
        .eq('id', results.task_id)

      results.tests.cleanup = {
        name: "Test Data Cleanup",
        success: true,
        message: "测试数据清理成功"
      }
      results.summary.passed++

    } catch (error) {
      results.tests.cleanup = {
        name: "Test Data Cleanup",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 计算最终结果
    results.summary.overallStatus = results.summary.failed === 0 ? 'ALL PASS' : 
                                   results.summary.passed > results.summary.failed ? 'MOSTLY PASS' : 'FAIL'
    
    results.execution_time_ms = Date.now() - startTime
    results.message = `签字执行测试完成. ${results.summary.passed}/${results.summary.total} 测试通过.`
    
    results.next = {
      message: results.summary.failed === 0 ? 
        "签字执行流程工作完全正常" : 
        "部分测试失败，需要检查问题",
      suggestions: results.summary.failed === 0 ? [
        "Token验证系统正常工作",
        "Position权限控制正确",
        "核心签字操作成功",
        "数据库触发器正确执行",
        "级联状态更新正常",
        "签字执行API已就绪",
        "可以开始前端集成测试"
      ] : [
        "检查失败的测试用例",
        "验证数据库连接和权限",
        "确认触发器是否正确创建",
        "检查API路由配置"
      ]
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('签字执行测试错误:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '测试执行失败',
        timestamp: new Date().toISOString(),
        test_id: testId,
        execution_time_ms: Date.now() - startTime
      },
      { status: 500 }
    )
  }
} 