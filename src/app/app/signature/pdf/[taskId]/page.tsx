'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProductionSignatureCanvas } from '../components/ProductionSignatureCanvas';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Save } from 'lucide-react';
import { Toast } from '@/lib/utils/toast';

interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: string;
  files: Array<{
    id: string;
    originalFilename: string;
    displayName: string;
    supabaseUrl: string;
  }>;
  recipients: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export default function SignatureSetupPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [taskData, setTaskData] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  // const [currentRecipientIndex, setCurrentRecipientIndex] = useState(0); // No longer needed

  useEffect(() => {
    if (taskId) {
      loadTaskData();
    }
  }, [taskId]);

  const loadTaskData = async () => {
    try {
      setLoading(true);
      
      const [taskResponse, recipientsResponse] = await Promise.all([
        fetch(`/api/signature/tasks/${taskId}`),
        fetch(`/api/signature/tasks/${taskId}/recipients`)
      ]);

      if (!taskResponse.ok || !recipientsResponse.ok) {
        throw new Error('Failed to load task data');
      }

      const taskData = await taskResponse.json();
      const recipientsData = await recipientsResponse.json();

      // Map files to include supabaseUrl field
      const mappedFiles = (taskData.files || []).map((file: any) => ({
        ...file,
        supabaseUrl: file.original_file_url // Map original_file_url to supabaseUrl
      }));

      setTaskData({
        ...taskData.task,
        files: mappedFiles,
        recipients: recipientsData.data || []
      });

    } catch (error) {
      console.error('Error loading task:', error);
      Toast.error('Failed to load task data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      // Update task status to indicate signatures are configured
      const response = await fetch(`/api/signature/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'signatures_configured' })
      });

      if (!response.ok) throw new Error('Failed to save');

      Toast.success('Signature configuration saved');
    } catch (error) {
      console.error('Save error:', error);
      Toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      // Check if all recipients have at least one signature field
      const positionsResponse = await fetch(`/api/signature/positions?taskId=${taskId}`);
      if (!positionsResponse.ok) throw new Error('Failed to check positions');
      
      const positions = await positionsResponse.json();
      const hasAllRecipientFields = taskData?.recipients.every(recipient =>
        positions.data.some((pos: any) => pos.recipient_id === recipient.id)
      );

      if (!hasAllRecipientFields) {
        Toast.warning('Please add signature fields for all recipients');
        return;
      }

      // Publish the task
      const publishResponse = await fetch(`/api/signature/tasks/${taskId}/publish`, {
        method: 'POST',
      });

      if (!publishResponse.ok) throw new Error('Failed to publish');

      Toast.success('Task published and emails sent to recipients');

      // Navigate back to task list
      router.push('/app/signature');
    } catch (error) {
      console.error('Publish error:', error);
      Toast.error('Failed to publish task');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading signature setup...</p>
        </div>
      </div>
    );
  }

  if (!taskData || taskData.files.length === 0 || taskData.recipients.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Invalid Task Configuration</h2>
          <p className="text-gray-600 mb-4">This task needs files and recipients before setting up signatures.</p>
          <Button onClick={() => router.push(`/app/signature/create-task/${taskId}`)}>
            Go Back to Configuration
          </Button>
        </div>
      </div>
    );
  }

  const currentFile = taskData.files[currentFileIndex];

  // Debug log
  console.log('Task data:', taskData);
  console.log('Current file:', currentFile);
  console.log('File URL:', currentFile?.supabaseUrl);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/app/signature/create-task/${taskId}`)}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{taskData.title}</h1>
              <p className="text-sm text-gray-600">
                Setting up signatures • {taskData.recipients.length} recipient{taskData.recipients.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            
            <Button
              onClick={handlePublish}
              disabled={publishing}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {publishing ? 'Publishing...' : 'Publish & Send'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ProductionSignatureCanvas
          key={`${currentFile.id}-${taskData.recipients[0]?.id}`}
          taskId={taskId}
          fileUrl={currentFile.supabaseUrl}
          fileId={currentFile.id}
          recipientId={taskData.recipients[0]?.id || ''}
          recipients={taskData.recipients}
          files={taskData.files.map(file => ({
            id: file.id,
            name: file.displayName || file.originalFilename,
            url: file.supabaseUrl,
            status: 'pending' // You can enhance this with actual status tracking
          }))}
          onFileChange={(fileId, fileUrl) => {
            const fileIndex = taskData.files.findIndex(f => f.id === fileId);
            if (fileIndex !== -1) {
              setCurrentFileIndex(fileIndex);
            }
          }}
        />
      </div>
    </div>
  );
}