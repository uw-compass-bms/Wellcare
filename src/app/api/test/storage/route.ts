import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase/client'

export async function GET() {
  try {
    // 使用普通客户端检查
    const { data: publicBuckets, error: publicError } = await supabase.storage.listBuckets()
    
    // 使用管理员客户端检查
    const { data: adminBuckets, error: adminError } = supabaseAdmin ? 
      await supabaseAdmin.storage.listBuckets() : { data: null, error: 'No admin client' }
    
    return NextResponse.json({
      publicClient: {
        buckets: publicBuckets?.map(b => b.name) || [],
        error: publicError?.message || null
      },
      adminClient: {
        buckets: adminBuckets?.map(b => b.name) || [],
        error: typeof adminError === 'string' ? adminError : adminError?.message || null
      },
      signatureBucketExists: {
        inPublic: publicBuckets?.some(b => b.name === 'signature-files') || false,
        inAdmin: adminBuckets?.some(b => b.name === 'signature-files') || false
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 