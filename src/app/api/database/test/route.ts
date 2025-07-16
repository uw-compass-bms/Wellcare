import { NextResponse } from 'next/server'
import { testDbConnection } from '@/lib/database/queries'

/**
 * 测试基础数据库连接 - Task 1.3
 */
export async function GET() {
  const result = await testDbConnection()
  
  if (result.success) {
    return NextResponse.json({
      status: 'success',
      message: result.message,
      timestamp: new Date().toISOString()
    })
  } else {
    return NextResponse.json(
      {
        status: 'error',
        error: result.error,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 