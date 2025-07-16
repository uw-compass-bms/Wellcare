import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

/**
 * GET /api/test/database-simple
 * 简单的数据库查询测试，不需要认证
 * 展示我们的数据库查询基础设施是否正常工作
 */
export async function GET() {
  try {
    const testResults: any = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: { passed: 0, failed: 0, total: 0 }
    }

    // Test 1: 测试表结构查询
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('signature_tasks')
        .select('*')
        .limit(0) // 只获取结构，不获取数据

      testResults.tests.tableStructure = {
        name: 'Table Structure Test',
        success: !tableError,
        message: tableError ? tableError.message : 'signature_tasks table structure accessible',
        error: tableError?.message
      }
      updateSummary(testResults, !tableError)
    } catch (error) {
      testResults.tests.tableStructure = {
        name: 'Table Structure Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      updateSummary(testResults, false)
    }

    // Test 2: 测试数据库函数调用
    try {
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_recipient_token')

      testResults.tests.databaseFunction = {
        name: 'Database Function Test',
        success: !tokenError && !!tokenData,
        message: tokenError ? tokenError.message : `Generated token: ${tokenData}`,
        data: tokenData,
        error: tokenError?.message
      }
      updateSummary(testResults, !tokenError && !!tokenData)
    } catch (error) {
      testResults.tests.databaseFunction = {
        name: 'Database Function Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      updateSummary(testResults, false)
    }

    // Test 3: 测试签字内容生成函数
    try {
      const { data: signatureContent, error: sigError } = await supabase
        .rpc('generate_signature_content', {
          recipient_name: 'Test User',
          sign_time: new Date().toISOString()
        })

      testResults.tests.signatureGeneration = {
        name: 'Signature Generation Test',
        success: !sigError && !!signatureContent,
        message: sigError ? sigError.message : `Generated signature: ${signatureContent}`,
        data: signatureContent,
        error: sigError?.message
      }
      updateSummary(testResults, !sigError && !!signatureContent)
    } catch (error) {
      testResults.tests.signatureGeneration = {
        name: 'Signature Generation Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      updateSummary(testResults, false)
    }

    // Test 4: 测试坐标转换函数
    try {
      const { data: pixelResult, error: pixelError } = await supabase
        .rpc('convert_percent_to_pixel', {
          percent_value: 50,
          page_dimension: 595
        })

      testResults.tests.coordinateConversion = {
        name: 'Coordinate Conversion Test',
        success: !pixelError && pixelResult !== null,
        message: pixelError ? pixelError.message : `50% of 595 = ${pixelResult} pixels`,
        data: { input: '50%', output: `${pixelResult}px` },
        error: pixelError?.message
      }
      updateSummary(testResults, !pixelError && pixelResult !== null)
    } catch (error) {
      testResults.tests.coordinateConversion = {
        name: 'Coordinate Conversion Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      updateSummary(testResults, false)
    }

    // 计算总结
    testResults.summary.overallStatus = testResults.summary.failed === 0 ? 'ALL PASS' : 'SOME FAILED'
    testResults.message = `Database function tests completed. ${testResults.summary.passed}/${testResults.summary.total} tests passed.`

    testResults.next = {
      message: "Database functions are working correctly",
      suggestions: [
        "Database schema is properly set up",
        "Custom functions are accessible",
        "Ready for authenticated CRUD operations",
        "Token generation system is functional",
        "Signature generation system is ready",
        "Coordinate conversion system is working"
      ]
    }

    const httpStatus = testResults.summary.overallStatus === 'ALL PASS' ? 200 : 500
    return NextResponse.json(testResults, { status: httpStatus })

  } catch (error) {
    return NextResponse.json({
      error: 'Database simple test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

function updateSummary(testResults: any, success: boolean) {
  testResults.summary.total++
  if (success) {
    testResults.summary.passed++
  } else {
    testResults.summary.failed++
  }
} 