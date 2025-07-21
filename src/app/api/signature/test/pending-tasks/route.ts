import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { validateAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth();
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Find tasks with pending signatures
    const { data: tasks, error: tasksError } = await supabase
      .from('signature_tasks')
      .select(`
        id,
        title,
        status,
        signature_recipients!inner(
          id,
          name,
          email,
          status,
          token,
          expires_at
        )
      `)
      .eq('user_id', authResult.userId)
      .eq('signature_recipients.status', 'pending')
      .in('status', ['draft', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (tasksError) {
      console.error('Failed to fetch tasks:', tasksError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch tasks'
      }, { status: 500 });
    }

    // Format the response
    const formattedTasks = tasks?.map(task => ({
      id: task.id,
      title: task.title,
      status: task.status,
      recipients: task.signature_recipients || []
    })) || [];

    return NextResponse.json({
      success: true,
      data: formattedTasks
    });

  } catch (error) {
    console.error('Error in pending tasks API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}