import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/middleware';
import { getTaskById } from '@/lib/database/queries';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');
    
    // Test auth
    const authResult = await validateAuth();
    
    let taskData = null;
    let recipients = null;
    let files = null;
    
    if (taskId && authResult.success && authResult.userId) {
      // Get task
      const taskResult = await getTaskById(taskId, authResult.userId);
      taskData = taskResult;
      
      // Get recipients
      const { data: recipientsData, error: recipientsError } = await supabase
        .from('signature_recipients')
        .select('*')
        .eq('task_id', taskId);
        
      recipients = { data: recipientsData, error: recipientsError };
      
      // Get files
      const { data: filesData, error: filesError } = await supabase
        .from('signature_files')
        .select('*')
        .eq('task_id', taskId);
        
      files = { data: filesData, error: filesError };
    }
    
    return NextResponse.json({
      success: true,
      auth: authResult,
      task: taskData,
      recipients,
      files,
      taskId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}