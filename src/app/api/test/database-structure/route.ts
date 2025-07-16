import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

/**
 * 数据库结构测试 - 无需认证
 * GET /api/test/database-structure
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

    // 测试1: 检查signature_tasks表
    try {
      const { data, error } = await supabase
        .from('signature_tasks')
        .select('count')
        .limit(1)
      
      addTest('signature_tasks表连接', !error, {
        error: error?.message,
        accessible: !error
      })
    } catch (error) {
      addTest('signature_tasks表连接', false, {
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 测试2: 检查signature_files表
    try {
      const { data, error } = await supabase
        .from('signature_files')
        .select('count')
        .limit(1)
      
      addTest('signature_files表连接', !error, {
        error: error?.message,
        accessible: !error
      })
    } catch (error) {
      addTest('signature_files表连接', false, {
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 测试3: 检查signature_recipients表
    try {
      const { data, error } = await supabase
        .from('signature_recipients')
        .select('count')
        .limit(1)
      
      addTest('signature_recipients表连接', !error, {
        error: error?.message,
        accessible: !error
      })
    } catch (error) {
      addTest('signature_recipients表连接', false, {
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 测试4: 检查signature_positions表
    try {
      const { data, error } = await supabase
        .from('signature_positions')
        .select('count')
        .limit(1)
      
      addTest('signature_positions表连接', !error, {
        error: error?.message,
        accessible: !error
      })
    } catch (error) {
      addTest('signature_positions表连接', false, {
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 测试5: 检查generate_recipient_token函数
    try {
      const { data, error } = await supabase.rpc('generate_recipient_token')
      
      addTest('generate_recipient_token函数', !error && data, {
        error: error?.message,
        tokenGenerated: !!data,
        tokenSample: data?.substring(0, 10) + '...'
      })
    } catch (error) {
      addTest('generate_recipient_token函数', false, {
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 测试6: 检查表结构 - signature_positions关键字段
    try {
      const { data, error } = await supabase
        .from('signature_positions')
        .select('x_percent, y_percent, width_percent, height_percent, x_pixel, y_pixel, page_number')
        .limit(0) // 只检查结构，不获取数据
      
      addTest('signature_positions表结构', !error, {
        error: error?.message,
        hasRequiredFields: !error
      })
    } catch (error) {
      addTest('signature_positions表结构', false, {
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 生成测试摘要
    testResults.summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      successRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) + '%' : '0%',
      status: passedTests === totalTests ? '✅ 数据库完全就绪' : '⚠️ 数据库问题',
      recommendation: passedTests === totalTests 
        ? '所有表和函数都可以正常访问，可以进行完整的位置CRUD测试'
        : '请检查数据库设置和表创建'
    }

    return NextResponse.json({
      success: passedTests === totalTests,
      message: `数据库结构测试完成: ${passedTests}/${totalTests} 通过`,
      data: testResults
    })

  } catch (error) {
    console.error('数据库结构测试错误:', error)
    return NextResponse.json({
      success: false,
      error: '数据库测试执行失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 