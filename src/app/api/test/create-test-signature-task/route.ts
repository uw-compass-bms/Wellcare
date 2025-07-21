import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { validateAuth } from '@/lib/auth/middleware';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth();
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // 1. Create a test task
    const taskId = crypto.randomUUID();
    const { error: taskError } = await supabase
      .from('signature_tasks')
      .insert({
        id: taskId,
        user_id: authResult.userId,
        title: `Test Signature Task - ${new Date().toLocaleDateString()}`,
        description: 'This is a test task for signature functionality',
        status: 'draft'
      });

    if (taskError) {
      console.error('Failed to create task:', taskError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create task'
      }, { status: 500 });
    }

    // 2. Create a test file
    const fileId = crypto.randomUUID();
    const { error: fileError } = await supabase
      .from('signature_files')
      .insert({
        id: fileId,
        task_id: taskId,
        original_filename: 'test-document.pdf',
        display_name: 'Test Document',
        file_size: 1024,
        original_file_url: '/sample.pdf', // Using the sample PDF in public folder
        file_order: 1,
        status: 'uploaded'
      });

    if (fileError) {
      console.error('Failed to create file:', fileError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create file'
      }, { status: 500 });
    }

    // 3. Create test recipients
    const recipients = [
      { name: 'Test User 1', email: 'test1@example.com' },
      { name: 'Test User 2', email: 'test2@example.com' }
    ];

    const recipientIds = [];
    
    for (const recipient of recipients) {
      const recipientId = crypto.randomUUID();
      recipientIds.push(recipientId);
      
      const token = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

      const { error: recipientError } = await supabase
        .from('signature_recipients')
        .insert({
          id: recipientId,
          task_id: taskId,
          name: recipient.name,
          email: recipient.email,
          token: token,
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        });

      if (recipientError) {
        console.error('Failed to create recipient:', recipientError);
      }
    }

    // 4. Create test signature positions
    const positions = [
      { page: 1, x: 10, y: 10, width: 20, height: 10, text: 'Click to sign' },
      { page: 1, x: 10, y: 25, width: 30, height: 5, text: 'Enter your name' },
      { page: 1, x: 10, y: 35, width: 30, height: 5, text: 'Enter date' }
    ];

    for (let i = 0; i < recipientIds.length; i++) {
      for (const pos of positions) {
        const { error: posError } = await supabase
          .from('signature_positions')
          .insert({
            recipient_id: recipientIds[i],
            file_id: fileId,
            page_number: pos.page,
            x_percent: pos.x,
            y_percent: pos.y,
            width_percent: pos.width,
            height_percent: pos.height,
            placeholder_text: pos.text,
            status: 'pending'
          });

        if (posError) {
          console.error('Failed to create position:', posError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        taskId,
        fileId,
        recipientCount: recipients.length,
        fieldCount: positions.length
      }
    });

  } catch (error) {
    console.error('Error creating test task:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}