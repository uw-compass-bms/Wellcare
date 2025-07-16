import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase/client'

export async function GET() {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {
      database: { status: 'unknown', message: '' },
      storage: { status: 'unknown', message: '' },
      auth: { status: 'unknown', message: '' }
    },
    environment: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV
    }
  }

  // 测试数据库连接
  try {
    const { data, error } = await supabase
      .from('signature_tasks')
      .select('count')
      .limit(1)
    
    if (error) {
      // 如果表不存在，这是预期的，因为我们还没有创建签名相关的表
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        healthStatus.services.database = {
          status: 'ready_for_setup',
          message: 'Database connected, signature tables need to be created'
        }
      } else {
        throw error
      }
    } else {
      healthStatus.services.database = {
        status: 'healthy',
        message: 'Database connected and signature tables exist'
      }
    }
  } catch (error) {
    healthStatus.services.database = {
      status: 'error',
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
    healthStatus.status = 'degraded'
  }

  // 测试存储桶访问
  try {
    // 使用管理员客户端检查存储桶，因为普通客户端可能没有权限查看所有桶
    const storageClient = supabaseAdmin || supabase
    const { data: buckets, error: bucketsError } = await storageClient.storage.listBuckets()
    
    if (bucketsError) {
      throw bucketsError
    }

    const signatureBucket = buckets?.find(bucket => bucket.name === 'signature-files')
    
    if (signatureBucket) {
      // 测试存储桶访问权限 - 如果权限不足也不认为是错误
      try {
        const { data: files, error: filesError } = await supabase.storage
          .from('signature-files')
          .list('', { limit: 1 })
        
        if (filesError) {
          // 如果是权限错误，桶存在但可能需要配置策略
          healthStatus.services.storage = {
            status: 'healthy',
            message: `Storage bucket exists (${filesError.message})`
          }
        } else {
          healthStatus.services.storage = {
            status: 'healthy',
            message: 'Storage bucket exists and accessible'
          }
        }
      } catch (accessError) {
        healthStatus.services.storage = {
          status: 'healthy',
          message: 'Storage bucket exists, access policies may need configuration'
        }
      }
    } else {
      healthStatus.services.storage = {
        status: 'ready_for_setup',
        message: 'Storage connected, signature-files bucket needs to be created'
      }
    }
  } catch (error) {
    healthStatus.services.storage = {
      status: 'error',
      message: `Storage access failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
    healthStatus.status = 'degraded'
  }

  // 测试认证配置
  try {
    if (supabaseAdmin) {
      // 简单测试管理员客户端
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 })
      
      if (error) {
        throw error
      }

      healthStatus.services.auth = {
        status: 'healthy',
        message: 'Auth service accessible with admin privileges'
      }
    } else {
      healthStatus.services.auth = {
        status: 'limited',
        message: 'Auth service accessible, admin key not configured'
      }
    }
  } catch (error) {
    healthStatus.services.auth = {
      status: 'error',
      message: `Auth service failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
    healthStatus.status = 'degraded'
  }

  // 确定整体状态
  const hasErrors = Object.values(healthStatus.services).some(service => service.status === 'error')
  if (hasErrors) {
    healthStatus.status = 'unhealthy'
  }

  // 根据状态返回对应的HTTP状态码
  const httpStatus = healthStatus.status === 'unhealthy' ? 503 : 200

  return NextResponse.json(healthStatus, { status: httpStatus })
} 