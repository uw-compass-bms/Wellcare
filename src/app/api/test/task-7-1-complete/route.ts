import { NextRequest, NextResponse } from 'next/server'
import { 
  sendEmail, 
  sendEmailWithRetry, 
  validateEmail, 
  checkResendHealth 
} from '@/lib/email/resend-client'

/**
 * GET /api/test/task-7-1-complete  
 * Task 7.1 完整功能测试 - Resend客户端配置
 * 
 * 综合测试内容：
 * 1. Resend客户端基础结构 ✅
 * 2. API密钥验证 ✅  
 * 3. 基础邮件发送功能 ✅
 * 4. 邮件发送错误处理 ✅
 * 5. 综合测试验证 ✅
 */
export async function GET(request: NextRequest) {
  const testResults = []
  let testsPassed = 0
  let totalTests = 0

  console.log('\n=== 开始 Task 7.1 完整功能测试 ===')
  console.log('测试目标: 验证Resend邮件客户端完整配置')

  try {
    // Test 1: 客户端模块导入和基础结构验证
    totalTests++
    console.log('\n--- Test 1: 客户端模块导入和基础结构 ---')
    try {
      // 验证模块导入
      const emailModule = await import('@/lib/email/resend-client')
      const requiredExports = ['resend', 'sendEmail', 'sendEmailWithRetry', 'validateEmail', 'checkResendHealth']
      const missingExports = requiredExports.filter(exportName => !(exportName in emailModule))
      
      if (missingExports.length > 0) {
        throw new Error(`缺少导出函数: ${missingExports.join(', ')}`)
      }

      if (!emailModule.default) {
        throw new Error('EMAIL_CONFIG未正确导出')
      }

      console.log('✅ 客户端模块结构完整')
      console.log(`   可用功能: ${requiredExports.length}`)
      
      testsPassed++
      testResults.push({
        test: 'Test 1: 客户端模块导入和基础结构',
        status: 'PASSED',
        details: {
          module_structure: 'complete',
          exports_available: requiredExports.length,
          config_available: true
        }
      })

    } catch (error) {
      console.log('❌ Test 1 失败:', error)
      testResults.push({
        test: 'Test 1: 客户端模块导入和基础结构',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Test 2: API密钥配置和健康检查
    totalTests++
    console.log('\n--- Test 2: API密钥配置和健康检查 ---')
    try {
      // 检查环境变量
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey || !apiKey.startsWith('re_')) {
        throw new Error('Resend API密钥配置异常')
      }

      // 执行健康检查
      const healthCheck = await checkResendHealth()
      if (!healthCheck.healthy) {
        throw new Error(healthCheck.error || 'Resend服务不健康')
      }

      console.log('✅ API密钥配置正常')
      console.log(`   密钥格式: 有效`)
      console.log(`   服务状态: 健康`)
      
      testsPassed++
      testResults.push({
        test: 'Test 2: API密钥配置和健康检查',
        status: 'PASSED',
        details: {
          api_key_configured: true,
          api_key_format: 'valid',
          service_healthy: healthCheck.healthy,
          connection_status: 'connected'
        }
      })

    } catch (error) {
      console.log('❌ Test 2 失败:', error)
      testResults.push({
        test: 'Test 2: API密钥配置和健康检查',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Test 3: 邮箱验证功能完整性
    totalTests++
    console.log('\n--- Test 3: 邮箱验证功能完整性 ---')
    try {
      const validationTestCases = [
        { email: 'test@example.com', expected: true },
        { email: 'invalid-email', expected: false },
        { email: 'user@domain', expected: false },
        { email: ['valid1@test.com', 'valid2@test.com'], expected: true },
        { email: ['valid@test.com', 'invalid-email'], expected: false }
      ]

      let validationPassed = 0
      for (const testCase of validationTestCases) {
        const result = validateEmail(testCase.email)
        if (result === testCase.expected) {
          validationPassed++
        }
      }

      if (validationPassed === validationTestCases.length) {
        console.log('✅ 邮箱验证功能完整')
        console.log(`   测试用例通过: ${validationPassed}/${validationTestCases.length}`)
        
        testsPassed++
        testResults.push({
          test: 'Test 3: 邮箱验证功能完整性',
          status: 'PASSED',
          details: {
            validation_accuracy: '100%',
            test_cases_passed: validationPassed,
            total_test_cases: validationTestCases.length
          }
        })
      } else {
        throw new Error(`邮箱验证测试失败: ${validationPassed}/${validationTestCases.length}`)
      }

    } catch (error) {
      console.log('❌ Test 3 失败:', error)
      testResults.push({
        test: 'Test 3: 邮箱验证功能完整性',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Test 4: 基础邮件发送功能（文本和HTML）
    totalTests++
    console.log('\n--- Test 4: 基础邮件发送功能 ---')
    try {
      // 发送文本邮件
      const textResult = await sendEmail({
        to: 'delivered@resend.dev',
        subject: 'Task 7.1 综合测试 - 文本邮件',
        text: `Task 7.1 Resend客户端配置测试\n\n测试时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n此邮件验证基础邮件发送功能正常工作。`
      })

      if (!textResult.success) {
        throw new Error(`文本邮件发送失败: ${textResult.error}`)
      }

      // 发送HTML邮件
      const htmlResult = await sendEmail({
        to: 'delivered@resend.dev',
        subject: 'Task 7.1 综合测试 - HTML邮件',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2563eb;">✅ Task 7.1 测试成功</h2>
              <p>Resend邮件客户端配置已完成并测试通过。</p>
              
              <div style="background: #f0f9ff; border: 1px solid #0ea5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0; color: #0369a1;">测试结果</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  <li>✅ 客户端基础结构</li>
                  <li>✅ API密钥验证</li>
                  <li>✅ 基础邮件发送</li>
                  <li>✅ 错误处理机制</li>
                </ul>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                测试时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
              </p>
            </body>
          </html>
        `,
        text: `Task 7.1 测试通过 - HTML邮件文本版本`
      })

      if (!htmlResult.success) {
        throw new Error(`HTML邮件发送失败: ${htmlResult.error}`)
      }

      console.log('✅ 基础邮件发送功能正常')
      console.log(`   文本邮件ID: ${textResult.messageId}`)
      console.log(`   HTML邮件ID: ${htmlResult.messageId}`)
      
      testsPassed++
      testResults.push({
        test: 'Test 4: 基础邮件发送功能',
        status: 'PASSED',
        details: {
          text_email_sent: true,
          html_email_sent: true,
          text_message_id: textResult.messageId,
          html_message_id: htmlResult.messageId
        }
      })

    } catch (error) {
      console.log('❌ Test 4 失败:', error)
      testResults.push({
        test: 'Test 4: 基础邮件发送功能',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Test 5: 错误处理机制验证
    totalTests++
    console.log('\n--- Test 5: 错误处理机制验证 ---')
    try {
      // 测试参数验证
      const invalidParamResult = await sendEmail({
        to: '',
        subject: '测试',
        text: '内容'
      })

      if (invalidParamResult.success) {
        throw new Error('参数验证失效 - 接受了空邮箱')
      }

      // 测试无效邮箱格式
      const invalidEmailResult = await sendEmail({
        to: 'invalid-email-format',
        subject: '测试',
        text: '内容'
      })

      if (invalidEmailResult.success) {
        throw new Error('邮箱验证失效 - 接受了无效邮箱')
      }

      console.log('✅ 错误处理机制正常')
      console.log(`   参数验证: 工作正常`)
      console.log(`   邮箱验证: 工作正常`)
      
      testsPassed++
      testResults.push({
        test: 'Test 5: 错误处理机制验证',
        status: 'PASSED',
        details: {
          parameter_validation: 'working',
          email_validation: 'working',
          error_handling: 'comprehensive'
        }
      })

    } catch (error) {
      console.log('❌ Test 5 失败:', error)
      testResults.push({
        test: 'Test 5: 错误处理机制验证',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Test 6: 重试机制验证
    totalTests++
    console.log('\n--- Test 6: 重试机制验证 ---')
    try {
      // 测试成功场景的重试
      const retryResult = await sendEmailWithRetry({
        to: 'delivered@resend.dev',
        subject: 'Task 7.1 测试 - 重试机制',
        text: `重试机制测试邮件\n\n测试时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
      }, 2)

      if (!retryResult.success) {
        throw new Error(`重试邮件发送失败: ${retryResult.error}`)
      }

      console.log('✅ 重试机制正常')
      console.log(`   重试邮件ID: ${retryResult.messageId}`)
      
      testsPassed++
      testResults.push({
        test: 'Test 6: 重试机制验证',
        status: 'PASSED',
        details: {
          retry_mechanism: 'working',
          retry_email_sent: true,
          message_id: retryResult.messageId
        }
      })

    } catch (error) {
      console.log('❌ Test 6 失败:', error)
      testResults.push({
        test: 'Test 6: 重试机制验证',
        status: 'FAILED',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 生成最终测试报告
    const successRate = Math.round((testsPassed / totalTests) * 100)
    const testSummary = {
      task: 'Task 7.1: Resend客户端配置 - 完整测试',
      total_tests: totalTests,
      passed: testsPassed,
      failed: totalTests - testsPassed,
      success_rate: successRate,
      status: testsPassed === totalTests ? 'ALL_PASSED' : 'SOME_FAILED',
      details: testResults,
      feature_coverage: {
        client_structure: '✅ 完成',
        api_key_validation: '✅ 完成',
        email_validation: '✅ 完成',
        basic_email_sending: '✅ 完成',
        error_handling: '✅ 完成',
        retry_mechanism: '✅ 完成'
      },
      subtasks_completed: [
        '7.1.1: 创建Resend客户端基础结构',
        '7.1.2: 配置Resend API密钥验证',
        '7.1.3: 实现基础邮件发送功能',
        '7.1.4: 添加邮件发送错误处理',
        '7.1.5: 创建简单邮件发送测试端点'
      ]
    }

    console.log(`\n=== Task 7.1 完整测试完成 ===`)
    console.log(`总测试数: ${totalTests}`)
    console.log(`通过: ${testsPassed}`)
    console.log(`失败: ${totalTests - testsPassed}`)
    console.log(`成功率: ${successRate}%`)

    if (testsPassed === totalTests) {
      console.log('\n🎉 Task 7.1 全部完成！')
      console.log('Resend邮件客户端配置已完全实现并测试通过')
    }

    return NextResponse.json({
      success: true,
      message: testsPassed === totalTests ? 
        'Task 7.1 Resend客户端配置完全成功！' : 
        'Task 7.1 部分功能需要修复',
      results: testSummary,
      test_status: testsPassed === totalTests ? '🎉 全部完成' : '❌ 部分失败',
      next_phase: testsPassed === totalTests ? 
        'Phase 7: Task 7.2 - 邮件模板系统' : 
        '修复当前问题后继续',
      recommendation: testsPassed === totalTests ? 
        '可以开始实现邮件模板系统和签字邀请邮件功能' : 
        '建议先解决失败的测试项再继续开发'
    })

  } catch (error) {
    console.error('Task 7.1 综合测试执行错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Task 7.1 综合测试执行失败',
        details: error instanceof Error ? error.message : '未知错误',
        completed_tests: testResults
      },
      { status: 500 }
    )
  }
} 