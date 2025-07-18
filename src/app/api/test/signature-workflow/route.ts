import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/middleware';
import { supabase } from '@/lib/supabase/client';

/**
 * Test the complete signature workflow
 * GET /api/test/signature-workflow?taskId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Validate auth
    const authResult = await validateAuth();
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const taskId = request.nextUrl.searchParams.get('taskId');
    if (!taskId) {
      return NextResponse.json({
        success: false,
        error: 'taskId parameter is required'
      }, { status: 400 });
    }

    // 2. Get task info
    const { data: task, error: taskError } = await supabase
      .from('signature_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', authResult.userId!)
      .single();

    if (taskError || !task) {
      return NextResponse.json({
        success: false,
        error: 'Task not found'
      }, { status: 404 });
    }

    // 3. Get recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('signature_recipients')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at');

    // 4. Get files
    const { data: files, error: filesError } = await supabase
      .from('signature_files')
      .select('*')
      .eq('task_id', taskId)
      .order('file_order');

    // 5. Get positions
    const { data: positions, error: positionsError } = await supabase
      .from('signature_positions')
      .select('*')
      .in('recipient_id', recipients?.map(r => r.id) || [])
      .order('created_at');

    // 6. Test public signing URLs
    const publicUrls = recipients?.map(r => ({
      recipientName: r.name,
      recipientEmail: r.email,
      status: r.status,
      signUrl: r.token ? `${request.nextUrl.origin}/sign/${r.token}` : null,
      tokenExpiry: r.token_expires_at
    })) || [];

    // 7. Test PDF generation URL
    const pdfGenerationUrl = `${request.nextUrl.origin}/api/signature/tasks/${taskId}/generate-pdf`;

    // 8. Summary
    const summary = {
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        created: task.created_at,
        lastModified: task.modified_at
      },
      recipients: {
        total: recipients?.length || 0,
        pending: recipients?.filter(r => r.status === 'pending').length || 0,
        signed: recipients?.filter(r => r.status === 'signed').length || 0,
        publicUrls
      },
      files: {
        total: files?.length || 0,
        list: files?.map(f => ({
          id: f.id,
          name: f.display_name,
          order: f.file_order,
          url: f.original_file_url
        })) || []
      },
      positions: {
        total: positions?.length || 0,
        pending: positions?.filter(p => p.status === 'pending').length || 0,
        signed: positions?.filter(p => p.status === 'signed').length || 0,
        byRecipient: recipients?.map(r => ({
          recipientName: r.name,
          totalPositions: positions?.filter(p => p.recipient_id === r.id).length || 0,
          signedPositions: positions?.filter(p => p.recipient_id === r.id && p.status === 'signed').length || 0
        })) || []
      },
      urls: {
        pdfGeneration: pdfGenerationUrl,
        emailSend: `${request.nextUrl.origin}/api/signature/email/send`
      },
      workflow: {
        step1: 'Create task and upload files ✓',
        step2: 'Add recipients ✓',
        step3: 'Place signature positions ✓',
        step4: 'Send emails to recipients',
        step5: 'Recipients sign via public URLs',
        step6: 'Generate final signed PDF'
      }
    };

    return NextResponse.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Workflow test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}