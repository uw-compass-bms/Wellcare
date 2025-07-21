// ⚠️ 警告：这是一个开发工具，仅在开发环境使用！
// 生产环境必须删除此文件！

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  // 仅在开发环境允许
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    const { sql } = await request.json();
    
    if (!sql) {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      );
    }

    console.log('Executing SQL:', sql);

    // 执行SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });

    if (error) {
      console.error('SQL execution error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}