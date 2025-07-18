'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues
const PDFSignatureLayout = dynamic(
  () => import('../components').then(mod => ({ default: mod.PDFSignatureLayout })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading PDF signature editor...</div>
      </div>
    )
  }
);

const DemoMode = dynamic(
  () => import('./demo-mode'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading demo...</div>
      </div>
    )
  }
);

// Types
interface Task {
  id: string;
  title: string;
  status: string;
}

interface FileInfo {
  id: string;
  displayName: string;
  originalFilename: string;
  supabaseUrl: string;
}

interface RecipientInfo {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface Widget {
  id: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  placeholder: string;
  recipientId: string;
}

export default function PDFSignaturePage() {
  const params = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  
  const taskId = params.taskId as string;

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [recipients, setRecipients] = useState<RecipientInfo[]>([]);

  // Get auth headers
  const getAuthHeaders = async () => {
    const token = await getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Load task data
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    loadTaskData();
  }, [taskId, isLoaded, isSignedIn]);

  const loadTaskData = async () => {
    try {
      const headers = await getAuthHeaders();
      
      // Load task (包含文件数据)
      console.log('Loading task:', taskId);
      const taskRes = await fetch(`/api/signature/tasks/${taskId}`, { headers });
      if (!taskRes.ok) {
        const errorData = await taskRes.text();
        console.error('Task load failed:', errorData);
        throw new Error('Failed to load task');
      }
      const taskData = await taskRes.json();
      setTask(taskData.task || taskData);
      
      // 处理文件数据 - 转换为前端期望的格式
      const rawFiles = taskData.files || [];
      const formattedFiles = rawFiles.map((file: any) => ({
        id: file.id,
        displayName: file.display_name || file.original_filename,
        originalFilename: file.original_filename,
        supabaseUrl: file.original_file_url || file.file_url,
        pageCount: file.page_count || 1
      }));
      setFiles(formattedFiles);
      console.log('Task and files loaded:', { taskData, formattedFiles });

      // Load recipients
      console.log('Loading recipients for task:', taskId);
      const recipientsRes = await fetch(`/api/signature/recipients?taskId=${taskId}`, { headers });
      if (!recipientsRes.ok) {
        const errorData = await recipientsRes.text();
        console.error('Recipients load failed:', errorData);
        throw new Error('Failed to load recipients');
      }
      const recipientsData = await recipientsRes.json();
      setRecipients(recipientsData.data || []);
      console.log('Recipients loaded:', recipientsData);

      setLoading(false);
    } catch (error) {
      console.error('Error loading task data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
      setLoading(false);
    }
  };

  // Handle save
  const handleSave = async (widgets: Widget[]) => {
    try {
      const headers = await getAuthHeaders();

      console.log('Saving widgets:', widgets);
      
      // 如果没有widgets，就跳过保存
      if (!widgets || widgets.length === 0) {
        console.log('No widgets to save');
        return;
      }

      // 确保我们有文件ID
      if (!files || files.length === 0) {
        throw new Error('No files available for saving positions');
      }

      // Convert widgets to API format and save each position
      for (const widget of widgets) {
        const position = {
          recipientId: widget.recipientId,
          fileId: files[0].id, // Use first file
          pageNumber: widget.page,
          x: widget.x,
          y: widget.y,
          width: widget.width,
          height: widget.height,
          placeholderText: widget.placeholder
        };

        console.log('Saving position:', position);

        const response = await fetch('/api/signature/positions', {
          method: 'POST',
          headers,
          body: JSON.stringify(position)
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Position save failed:', error);
          throw new Error(error.error || 'Failed to save position');
        } else {
          const result = await response.json();
          console.log('Position saved successfully:', result);
        }
      }

      // Update task modified time
      const updateResponse = await fetch(`/api/signature/tasks/${taskId}/update-modified`, {
        method: 'PUT',
        headers
      });

      if (!updateResponse.ok) {
        console.warn('Failed to update task modified time');
      }

      console.log('All positions saved successfully');

    } catch (error) {
      console.error('Error saving positions:', error);
      throw error;
    }
  };

  // Handle send
  const handleSend = async () => {
    if (recipients.length === 0) {
      alert('Please add recipients first');
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/signature/email/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({ taskId })
      });

      const result = await response.json();
      if (result.success) {
        alert(`Emails sent successfully to ${result.sentCount} recipients!`);
      } else {
        alert(`Failed to send emails: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      alert('Failed to send emails');
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading PDF signature editor...</div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Please sign in to continue</div>
      </div>
    );
  }

  // 如果有错误或者没有数据，显示演示模式
  if (error || (!files.length && !recipients.length && !loading)) {
    return <DemoMode taskId={taskId} />;
  }

  return (
    <PDFSignatureLayout
      taskId={taskId}
      files={files}
      recipients={recipients}
      onSave={handleSave}
      onSend={handleSend}
    />
  );
}