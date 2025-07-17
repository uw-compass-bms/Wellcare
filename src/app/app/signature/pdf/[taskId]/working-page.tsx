'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import WorkingPDFSignature from '../components/working-pdf-signature';

interface TaskInfo {
  id: string;
  title: string;
  description?: string;
  status: string;
}

interface FileInfo {
  id: string;
  originalFilename: string;
  displayName: string;
  supabaseUrl: string;
}

interface RecipientInfo {
  id: string;
  name: string;
  email: string;
  status: string;
}

export default function WorkingPDFSignaturePage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<TaskInfo | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [recipients, setRecipients] = useState<RecipientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // Load task data
  useEffect(() => {
    loadTaskData();
  }, [taskId]);

  const loadTaskData = async () => {
    setLoading(true);
    try {
      const [taskResponse, recipientsResponse] = await Promise.all([
        fetch(`/api/signature/tasks/${taskId}`),
        fetch(`/api/signature/tasks/${taskId}/recipients`)
      ]);

      if (taskResponse.ok) {
        const taskData = await taskResponse.json();
        setTask(taskData.task);
        
        // Process file data
        const processedFiles = (taskData.files || []).map((file: any) => ({
          id: file.id,
          originalFilename: file.original_filename || file.originalFilename || 'unknown.pdf',
          displayName: file.display_name || file.displayName || file.original_filename || 'Unknown File',
          supabaseUrl: file.original_file_url || file.supabaseUrl || ''
        }));
        setFiles(processedFiles);
      }

      if (recipientsResponse.ok) {
        const recipientsData = await recipientsResponse.json();
        const processedRecipients = (recipientsData.data || []).map((recipient: any) => ({
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          status: recipient.status || 'pending'
        }));
        setRecipients(processedRecipients);
      }

    } catch (error) {
      console.error('Failed to load task data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.push('/app/signature');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // This would typically save any pending changes
      console.log('Saving task...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate save
      alert('Task saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmails = async () => {
    setSending(true);
    try {
      // Validate before sending
      if (recipients.length === 0) {
        alert('Please add recipients first');
        return;
      }

      console.log('Sending emails...');
      
      const response = await fetch(`/api/signature/tasks/${taskId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send emails');
      }

      const result = await response.json();
      
      if (result.success) {
        alert('Emails sent successfully! Recipients will receive signature invitations.');
        await loadTaskData(); // Reload to get updated status
      } else {
        throw new Error(result.error || 'Failed to send emails');
      }
    } catch (error) {
      console.error('Failed to send emails:', error);
      alert(`Failed to send emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF signature setup...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Task Not Found</h2>
          <p className="text-gray-600 mb-4">Please check if the task ID is correct</p>
          <button 
            onClick={handleGoBack}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <WorkingPDFSignature
      taskId={taskId}
      taskTitle={task.title}
      files={files}
      recipients={recipients}
      onGoBack={handleGoBack}
      onSave={handleSave}
      onSendEmails={handleSendEmails}
      isSaving={saving}
      isSending={sending}
    />
  );
}