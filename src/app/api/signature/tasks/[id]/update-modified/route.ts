import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/middleware';
import { supabase } from '@/lib/supabase/client';

/**
 * 更新任务的最后修改时间
 * POST /api/signature/tasks/[id]/update-modified
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await validateAuth();
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const taskId = params.id;

    // 验证任务存在且属于当前用户
    const { data: task, error: taskError } = await supabase
      .from('signature_tasks')
      .select('id, user_id')
      .eq('id', taskId)
      .eq('user_id', authResult.userId!)
      .single();

    if (taskError || !task) {
      return NextResponse.json({
        success: false,
        error: 'Task not found or access denied'
      }, { status: 404 });
    }

    // 更新最后修改时间
    const { error: updateError } = await supabase
      .from('signature_tasks')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (updateError) {
      throw new Error(`Failed to update task: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully',
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update task',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}