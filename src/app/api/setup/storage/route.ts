import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/client'

export async function POST() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 500 }
    )
  }

  try {
    // 创建 signature-files 存储桶
    const { data: bucket, error: bucketError } = await supabaseAdmin.storage
      .createBucket('signature-files', {
        public: false,
        allowedMimeTypes: ['application/pdf'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
      })

    if (bucketError) {
      // 如果桶已存在，这不是错误
      if (bucketError.message.includes('already exists')) {
        return NextResponse.json({
          success: true,
          message: 'Storage bucket already exists',
          bucket: 'signature-files'
        })
      }
      throw bucketError
    }

    // 设置存储桶策略（允许认证用户访问）
    const policySQL = `
      CREATE POLICY "Users can upload signature files" ON storage.objects 
      FOR INSERT TO authenticated 
      WITH CHECK (bucket_id = 'signature-files');

      CREATE POLICY "Users can view their signature files" ON storage.objects 
      FOR SELECT TO authenticated 
      USING (bucket_id = 'signature-files');

      CREATE POLICY "Users can update their signature files" ON storage.objects 
      FOR UPDATE TO authenticated 
      USING (bucket_id = 'signature-files');

      CREATE POLICY "Users can delete their signature files" ON storage.objects 
      FOR DELETE TO authenticated 
      USING (bucket_id = 'signature-files');
    `

    // 注意：这里我们先创建桶，策略可以在Supabase仪表板中手动设置
    
    return NextResponse.json({
      success: true,
      message: 'Storage bucket created successfully',
      bucket: bucket,
      note: 'Please configure storage policies in Supabase dashboard if needed'
    })

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create storage bucket',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 