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

    // Find pending recipients with their tasks and field counts
    const { data: recipients, error } = await supabase
      .from('signature_recipients')
      .select(`
        id,
        name,
        email,
        status,
        token,
        expires_at,
        signature_tasks!inner(
          id,
          title,
          status,
          user_id
        ),
        signature_positions(count)
      `)
      .eq('status', 'pending')
      .eq('signature_tasks.user_id', authResult.userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to fetch recipients:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch recipients'
      }, { status: 500 });
    }

    // Format the response
    const formattedRecipients = recipients?.map(recipient => ({
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      status: recipient.status,
      token: recipient.token,
      expires_at: recipient.expires_at,
      task_id: recipient.signature_tasks.id,
      task_title: recipient.signature_tasks.title,
      task_status: recipient.signature_tasks.status,
      field_count: recipient.signature_positions?.[0]?.count || 0
    })) || [];

    return NextResponse.json({
      success: true,
      data: formattedRecipients
    });

  } catch (error) {
    console.error('Error in pending recipients API:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}