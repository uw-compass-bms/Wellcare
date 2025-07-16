import { NextRequest, NextResponse } from 'next/server'
import { 
  generateSignatureContent, 
  generateSimpleSignature, 
  generateArtisticSignature,
  validateRecipientName,
  getSupportedTimezones,
  generateBatchSignatures,
  DEFAULT_SIGNATURE_STYLE
} from '@/lib/signature/generator'

/**
 * GET /api/test/signature-generator
 * 测试签字生成器的各项功能
 * 
 * 测试内容：
 * 1. 基础签字内容生成
 * 2. 简单格式签字生成
 * 3. 艺术字体签字生成
 * 4. 时间戳格式验证
 * 5. 姓名验证功能
 * 6. 批量签字生成
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 获取测试参数
    const { searchParams } = new URL(request.url)
    const testName = searchParams.get('name') || 'John Smith'
    const testNameChinese = searchParams.get('chinese_name') || '张三'
    
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        passed: 0,
        failed: 0,
        total: 0
      }
    }

    // 1. 测试基础签字内容生成
    try {
      const signature = generateSignatureContent(testName)
      results.tests.basicGeneration = {
        name: "Basic Signature Generation Test",
        success: true,
        message: `Generated signature for ${testName}`,
        data: {
          text: signature.text,
          recipientName: signature.metadata.recipientName,
          timestamp: signature.metadata.timestamp,
          timezone: signature.metadata.timezone,
          style: signature.style
        }
      }
      results.summary.passed++
    } catch (error) {
      results.tests.basicGeneration = {
        name: "Basic Signature Generation Test",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 2. 测试中文姓名签字生成
    try {
      const chineseSignature = generateSignatureContent(testNameChinese, {
        timeFormat: 'full',
        timezone: 'Asia/Shanghai'
      })
      results.tests.chineseGeneration = {
        name: "Chinese Name Signature Generation Test",
        success: true,
        message: `Generated signature for Chinese name: ${testNameChinese}`,
        data: {
          text: chineseSignature.text,
          recipientName: chineseSignature.metadata.recipientName,
          timestamp: chineseSignature.metadata.timestamp
        }
      }
      results.summary.passed++
    } catch (error) {
      results.tests.chineseGeneration = {
        name: "Chinese Name Signature Generation Test",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 3. 测试简单格式签字生成
    try {
      const simpleSignature = generateSimpleSignature(testName)
      const isCorrectFormat = simpleSignature.includes('【') && 
                             simpleSignature.includes('】signed at【') && 
                             simpleSignature.includes('】')
      
      results.tests.simpleGeneration = {
        name: "Simple Signature Generation Test",
        success: isCorrectFormat,
        message: isCorrectFormat ? 
          `Simple signature format correct: ${simpleSignature}` :
          `Simple signature format incorrect: ${simpleSignature}`,
        data: simpleSignature
      }
      results.summary.passed += isCorrectFormat ? 1 : 0
      results.summary.failed += isCorrectFormat ? 0 : 1
    } catch (error) {
      results.tests.simpleGeneration = {
        name: "Simple Signature Generation Test",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 4. 测试艺术字体签字生成
    try {
      const artisticSignature = generateArtisticSignature(testName, true)
      const hasIcon = artisticSignature.includes('🖋️')
      const hasCheckmark = artisticSignature.includes('✔️')
      
      results.tests.artisticGeneration = {
        name: "Artistic Signature Generation Test",
        success: hasIcon && hasCheckmark,
        message: `Artistic signature ${hasIcon && hasCheckmark ? 'contains' : 'missing'} expected icons`,
        data: artisticSignature
      }
      results.summary.passed += (hasIcon && hasCheckmark) ? 1 : 0
      results.summary.failed += (hasIcon && hasCheckmark) ? 0 : 1
    } catch (error) {
      results.tests.artisticGeneration = {
        name: "Artistic Signature Generation Test",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 5. 测试不同时间格式
    try {
      const formats = ['full', 'date-only', 'compact'] as const
      const timeFormatTests: any = {}
      
      for (const format of formats) {
        const signature = generateSignatureContent(testName, { timeFormat: format })
        timeFormatTests[format] = {
          timestamp: signature.metadata.timestamp,
          format: signature.metadata.format
        }
      }
      
      results.tests.timeFormats = {
        name: "Time Format Variation Test",
        success: true,
        message: "All time formats generated successfully",
        data: timeFormatTests
      }
      results.summary.passed++
    } catch (error) {
      results.tests.timeFormats = {
        name: "Time Format Variation Test",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 6. 测试姓名验证功能
    try {
      const validNames = [testName, testNameChinese, 'Mary Johnson', '李明']
      const invalidNames = ['', '   ', 'Name@#$%', 'A'.repeat(60)]
      
      const validationResults = {
        validNames: validNames.map(name => ({
          name,
          isValid: validateRecipientName(name)
        })),
        invalidNames: invalidNames.map(name => ({
          name,
          isValid: validateRecipientName(name)
        }))
      }
      
      const allValidPassed = validationResults.validNames.every(result => result.isValid)
      const allInvalidFailed = validationResults.invalidNames.every(result => !result.isValid)
      
      results.tests.nameValidation = {
        name: "Name Validation Test",
        success: allValidPassed && allInvalidFailed,
        message: `Valid names: ${allValidPassed ? 'PASS' : 'FAIL'}, Invalid names: ${allInvalidFailed ? 'PASS' : 'FAIL'}`,
        data: validationResults
      }
      results.summary.passed += (allValidPassed && allInvalidFailed) ? 1 : 0
      results.summary.failed += (allValidPassed && allInvalidFailed) ? 0 : 1
    } catch (error) {
      results.tests.nameValidation = {
        name: "Name Validation Test",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 7. 测试批量签字生成
    try {
      const recipients = [
        { id: 'rec1', name: testName },
        { id: 'rec2', name: testNameChinese },
        { id: 'rec3', name: 'Alice Johnson' }
      ]
      
      const batchSignatures = generateBatchSignatures(recipients, {
        timeFormat: 'full',
        useIcon: true
      })
      
      const allGenerated = batchSignatures.length === recipients.length &&
                          batchSignatures.every(sig => sig.signature.text.length > 0)
      
      results.tests.batchGeneration = {
        name: "Batch Signature Generation Test",
        success: allGenerated,
        message: `Generated ${batchSignatures.length} signatures for ${recipients.length} recipients`,
        data: batchSignatures.map(sig => ({
          recipientId: sig.recipientId,
          signatureText: sig.signature.text,
          timestamp: sig.signature.metadata.timestamp
        }))
      }
      results.summary.passed += allGenerated ? 1 : 0
      results.summary.failed += allGenerated ? 0 : 1
    } catch (error) {
      results.tests.batchGeneration = {
        name: "Batch Signature Generation Test",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 8. 测试时区支持
    try {
      const timezones = getSupportedTimezones()
      const timezoneTest = timezones.slice(0, 3).map(tz => {
        const signature = generateSignatureContent(testName, { timezone: tz })
        return {
          timezone: tz,
          timestamp: signature.metadata.timestamp
        }
      })
      
      results.tests.timezoneSupport = {
        name: "Timezone Support Test",
        success: true,
        message: `Tested ${timezoneTest.length} timezones`,
        data: {
          supportedTimezones: timezones,
          testResults: timezoneTest
        }
      }
      results.summary.passed++
    } catch (error) {
      results.tests.timezoneSupport = {
        name: "Timezone Support Test",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
      results.summary.failed++
    }
    results.summary.total++

    // 计算执行时间
    const executionTime = Date.now() - startTime
    
    // 整体结果
    results.summary.overallStatus = results.summary.failed === 0 ? 'ALL PASS' : 
                                   results.summary.passed > results.summary.failed ? 'MOSTLY PASS' : 'FAIL'
    
    results.performance = {
      executionTimeMs: executionTime,
      testsPerSecond: Math.round((results.summary.total / executionTime) * 1000)
    }
    
    results.message = `Signature generator tests completed. ${results.summary.passed}/${results.summary.total} tests passed.`
    
    results.next = {
      message: results.summary.failed === 0 ? 
        "Signature generator is working correctly" : 
        "Some tests failed, review implementation",
      suggestions: results.summary.failed === 0 ? [
        "Signature generation formats are correct",
        "Time format handling is working",
        "Name validation is functional", 
        "Batch generation is supported",
        "Ready for integration with sign execution API",
        "Artistic font rendering is ready"
      ] : [
        "Review failed tests and fix issues",
        "Check signature format requirements",
        "Verify time handling logic",
        "Test name validation edge cases"
      ]
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Signature generator test error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Test execution failed',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 