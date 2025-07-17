import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth/middleware'
import { testDbConnection } from '@/lib/database/queries'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    console.log('Health check started...')
    
    const healthStatus = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {
        database: { status: 'unknown', message: '' },
        clerk_auth: { status: 'unknown', message: '' }
      },
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasClerkPublishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
        nodeEnv: process.env.NODE_ENV
      }
    }

    // 1. 测试数据库连接
    console.log('Testing database connection...')
    const dbResult = await testDbConnection()
    console.log('Database test result:', dbResult)
    
    if (dbResult.success) {
      healthStatus.services.database = {
        status: 'healthy',
        message: 'Database connected and signature tables exist'
      }
    } else {
      healthStatus.services.database = {
        status: 'error',
        message: `Database connection failed: ${dbResult.error}`
      }
      healthStatus.status = 'degraded'
    }

    // 2. 测试Clerk认证（可选）
    let authResult = null
    try {
      console.log('Testing Clerk authentication...')
      authResult = await validateAuth()
      console.log('Auth test result:', authResult)
      
      if (authResult.success) {
        healthStatus.services.clerk_auth = {
          status: 'authenticated',
          message: `User authenticated: ${authResult.userId}`
        }
      } else {
        healthStatus.services.clerk_auth = {
          status: 'unauthenticated',
          message: authResult.error || 'No authentication provided'
        }
      }
    } catch (authError) {
      console.log('Auth error (expected for unauthenticated requests):', authError)
      healthStatus.services.clerk_auth = {
        status: 'unauthenticated',
        message: 'No authentication provided (this is normal for health checks)'
      }
    }

    // 3. 返回健康状态
    console.log('Health check completed:', healthStatus)
    
    // 确定整体状态
    const hasErrors = Object.values(healthStatus.services).some(service => service.status === 'error')
    if (hasErrors) {
      healthStatus.status = 'unhealthy'
    }
    
    const httpStatus = healthStatus.status === 'unhealthy' ? 503 : 200
    return NextResponse.json(healthStatus, { status: httpStatus })
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 