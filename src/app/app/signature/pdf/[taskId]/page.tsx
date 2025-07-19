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
      const mappedFiles = (taskData.files || [])
        .map((file: any, index: number) => ({
          ...file,
          supabaseUrl: file.original_file_url, // Map original_file_url to supabaseUrl
          originalFilename: file.original_filename, // Ensure the correct field name
          displayName: file.display_name, // Ensure the correct field name
          fileOrder: file.file_order || index + 1,
          file_order: file.file_order || index + 1 // Keep both naming conventions
        }));

      // Check if we have a saved order in localStorage (from create-task page)
      const savedOrder = localStorage.getItem(`task-${taskId}-file-order`);
      if (savedOrder) {
        try {
          const orderMap = JSON.parse(savedOrder);
          const orderDict = Object.fromEntries(orderMap.map((item: any) => [item.id, item.order]));
          
          // Apply saved order if it exists
          mappedFiles.forEach((file: any) => {
            if (orderDict[file.id]) {
              file.fileOrder = orderDict[file.id];
              file.file_order = orderDict[file.id];
            }
          });
        } catch (e) {
          console.log('Failed to parse saved file order');
        }
      }
      
      // Sort by file_order
      mappedFiles.sort((a: any, b: any) => (a.fileOrder || a.file_order) - (b.fileOrder || b.file_order));

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
      // First, verify all fields are saved
      const positionsResponse = await fetch(`/api/signature/positions?taskId=${taskId}`);
      if (!positionsResponse.ok) {
        throw new Error('Failed to verify saved fields');
      }
      
      const positions = await positionsResponse.json();
      const fieldCount = positions.data?.length || 0;
      console.log('Saved positions:', fieldCount);
      
      // Save button should keep the task in draft status
      // No status update needed - fields are already saved automatically
      
      Toast.success(`Configuration saved! ${fieldCount} fields configured.`);
      
      // Wait a moment for the toast to show, then redirect to drafts page
      setTimeout(() => {
        router.push('/app/signature?tab=drafts');
      }, 1000);
    } catch (error) {
      console.error('Save error:', error);
      Toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
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
          files={taskData.files
            .sort((a, b) => (a.fileOrder || a.file_order || 0) - (b.fileOrder || b.file_order || 0))
            .map((file, index) => {
              console.log('Mapping file:', file); // Debug log
              return {
                id: file.id,
                name: file.displayName || file.originalFilename || file.display_name || file.original_filename || 'Unnamed File',
                url: file.supabaseUrl,
                order: file.fileOrder || file.file_order || index + 1
              };
            })}
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