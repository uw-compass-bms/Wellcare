import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  try {
    // 获取所有文件记录，用于调试
    const { data: files, error } = await supabase
      .from('signature_files')
      .select('*')
      .limit(5);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      files: files || [],
      message: 'Debug: showing file records from database'
    });

  } catch (error) {
    console.error('Files debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 