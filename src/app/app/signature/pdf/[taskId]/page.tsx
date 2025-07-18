'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Send } from 'lucide-react';
import dynamic from 'next/dynamic';

// Import components
import { 
  TopBar,
  SimplePDFViewer,
  DragWidgetsGroup
} from '../components';
import { 
  convertToComponentPosition, 
  convertToApiPosition,
  convertToComponentPositions 
} from '@/lib/utils/coordinates-enhanced';

// Import API services
import {
  SignaturePosition,
  createSignaturePosition,
  updateSignaturePosition,
  deleteSignaturePosition,
  getRecipientPositions,
  CreatePositionRequest
} from '@/lib/api/signature-positions';
import { SignaturePositionData, RecipientInfo } from '@/lib/types/signature';

// Use the new PDF viewer canvas


// Type definitions
interface TaskInfo {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
}

interface FileInfo {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  originalFilename: string;
  displayName: string;
  supabaseUrl: string;
  status: string;
  // Database field mappings
  original_filename?: string;
  display_name?: string;
  original_file_url?: string;
  file_size?: number;
  uploaded_at?: string;
}

export default function PDFSignaturePage() {
  const params = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<TaskInfo | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [recipients, setRecipients] = useState<RecipientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // PDF viewer state
  const [currentFileId, setCurrentFileId] = useState<string>('');
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [signaturePositions, setSignaturePositions] = useState<SignaturePosition[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<SignaturePosition | null>(null);
  const [loadingPositions, setLoadingPositions] = useState<boolean>(false);
  const [savingPosition, setSavingPosition] = useState<boolean>(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');

  // 认证检查
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // 用户未登录，重定向到登录页面
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // 获取认证token的辅助函数
  const getAuthHeaders = async () => {
    const token = await getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Load task data
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadTaskData();
    }
  }, [taskId, isLoaded, isSignedIn]);

  // 加载收件人数据
  useEffect(() => {
    const loadRecipients = async () => {
      if (!isLoaded || !isSignedIn) return;
      
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/signature/tasks/${taskId}/recipients`, {
          headers
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          // 转换API返回的数据为RecipientInfo类型
          const formattedRecipients: RecipientInfo[] = data.data.map((recipient: any) => ({
            id: recipient.id,
            name: recipient.name,
            email: recipient.email,
            role: recipient.role || 'signer', // 默认角色
            status: recipient.status || 'pending' // 默认状态
          }));
          setRecipients(formattedRecipients);
          if (formattedRecipients.length > 0) {
            setSelectedRecipientId(formattedRecipients[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to load recipients:', error);
      }
    };
    
    loadRecipients();
  }, [taskId, isLoaded, isSignedIn]);

  // Set default file when files load
  useEffect(() => {
    if (files.length > 0 && !currentFileId) {
      setCurrentFileId(files[0].id);
      setCurrentPageNumber(1);
    }
  }, [files, currentFileId]);

  // Set default recipient when recipients load
  useEffect(() => {
    if (recipients.length > 0 && !selectedRecipientId) {
      setSelectedRecipientId(recipients[0].id);
    }
  }, [recipients, selectedRecipientId]);

  // Load signature positions when recipients are available
  useEffect(() => {
    if (recipients.length > 0) {
      loadSignaturePositions();
    }
  }, [recipients]);

  const loadSignaturePositions = async () => {
    if (recipients.length === 0 || !isLoaded || !isSignedIn) return;

    setLoadingPositions(true);
    try {
      const headers = await getAuthHeaders();
      const allPositions: SignaturePosition[] = [];
      
      for (const recipient of recipients) {
        const response = await fetch(`/api/signature/recipients/${recipient.id}/positions`, {
          headers
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`Positions API response for ${recipient.name}:`, result);
          
          if (result.success && result.data?.filesWithPositions) {
            // 处理新的API格式
            result.data.filesWithPositions.forEach((fileData: any) => {
              fileData.positions.forEach((pos: any) => {
                const position: SignaturePosition = {
                  id: pos.id,
                  recipientId: recipient.id,
                  fileId: fileData.file.id,
                  pageNumber: pos.pageNumber,
                  x: pos.coordinates.percent.x,
                  y: pos.coordinates.percent.y,
                  width: pos.coordinates.percent.width,
                  height: pos.coordinates.percent.height,
                  placeholderText: pos.placeholderText,
                  status: pos.status,
                  signatureContent: pos.signatureContent,
                  signedAt: pos.signedAt
                };
                allPositions.push(position);
              });
            });
          }
        } else {
          console.warn(`Failed to load positions for recipient ${recipient.name}`);
        }
      }

      setSignaturePositions(allPositions);
      console.log('Loaded signature positions:', allPositions.length);
    } catch (error) {
      console.error('Error loading signature positions:', error);
    } finally {
      setLoadingPositions(false);
    }
  };

  const loadTaskData = async () => {
    if (!isLoaded || !isSignedIn) return;
    
    try {
      const headers = await getAuthHeaders();
      const [taskResponse, recipientsResponse] = await Promise.all([
        fetch(`/api/signature/tasks/${taskId}`, { headers }),
        fetch(`/api/signature/tasks/${taskId}/recipients`, { headers })
      ]);

      if (taskResponse.ok) {
        const taskData = await taskResponse.json();
        setTask(taskData.task);
        // Process file data with required field mappings
        const processedFiles = (taskData.files || []).map((file: any) => ({
          ...file,
          originalFilename: file.original_filename || file.originalFilename || file.fileName || 'unknown.pdf',
          displayName: file.display_name || file.displayName || file.original_filename || file.fileName || 'Unknown File',
          supabaseUrl: file.original_file_url || file.supabaseUrl || file.filePath || '',
          status: file.status || 'uploaded'
        }));
        setFiles(processedFiles);
      }

      if (recipientsResponse.ok) {
        const recipientsData = await recipientsResponse.json();
        setRecipients(recipientsData.data || []);
      }

    } catch (error) {
      console.error('Failed to load task data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler functions
  const handleGoBack = () => {
    router.push('/app/signature');
  };

  const handleSavePositions = async () => {
    setSaving(true);
    try {
      // Save Draft 应该保存所有位置，包括已经保存的
      console.log('Saving draft with all positions:', signaturePositions.length);
      
      // 更新任务的最后修改时间
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/signature/tasks/${taskId}/update-modified`, {
        method: 'POST',
        headers
      });
      
      if (response.ok) {
        alert('Draft saved successfully');
      } else {
        const error = await response.json();
        console.error('Failed to update task:', error);
        alert('Draft saved, but failed to update task status');
      }
      
    } catch (error) {
      console.error('Save draft error:', error);
      alert('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmails = async () => {
    setSending(true);
    try {
      console.log('Sending emails...');
      
      // 验证是否有收件人和签字位置
      if (recipients.length === 0) {
        alert('Please add recipients first');
        setSending(false);
        return;
      }

      if (signaturePositions.length === 0) {
        alert('Please add signature positions first');
        setSending(false);
        return;
      }

      // 调用发布API
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/signature/tasks/${taskId}/publish`, {
        method: 'POST',
        headers: headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send emails');
      }

      const result = await response.json();
      console.log('Email sending result:', result);

      if (result.success) {
        alert('Emails sent successfully! Recipients will receive signature invitations.');
        // 重新加载任务数据以获取最新状态
        await loadTaskData();
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

  // PDF-related handlers
  const handleFileChange = (fileId: string) => {
    setCurrentFileId(fileId);
    setCurrentPageNumber(1);
    setSelectedPosition(null);
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPageNumber(pageNumber);
    setSelectedPosition(null);
  };

  const handlePositionSelect = (position: SignaturePosition | null) => {
    setSelectedPosition(position);
  };

  const handlePositionUpdate = (position: SignaturePosition) => {
    if (!position.id || position.id.startsWith('temp-')) {
      // Temporary position, update local state only
      setSignaturePositions(prev => 
        prev.map(p => p.id === position.id ? position : p)
      );
      return;
    }

    // Update position in database
    updatePositionInDatabase(position);
  };

  const updatePositionInDatabase = async (position: SignaturePosition) => {
    if (!position.id) return;

    try {
      const updates: Partial<CreatePositionRequest> = {
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
        placeholderText: position.placeholderText
      };

      // 使用认证头直接调用API
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/signature/positions/${position.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setSignaturePositions(prev => 
          prev.map(p => p.id === position.id ? {...p, ...updates} : p)
        );
        console.log('Signature position updated successfully');
      } else {
        console.error('Failed to update signature position:', result.error);
        alert(`Update failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating signature position:', error);
      alert('Update failed, please try again');
    }
  };

  const handlePositionDelete = async (positionId: string) => {
    if (positionId.startsWith('temp-')) {
      // Temporary position, remove from local state
      setSignaturePositions(prev => prev.filter(p => p.id !== positionId));
      setSelectedPosition(null);
      return;
    }

    try {
      // 使用认证头直接调用API
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/signature/positions/${positionId}`, {
        method: 'DELETE',
        headers
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setSignaturePositions(prev => prev.filter(p => p.id !== positionId));
        setSelectedPosition(null);
        console.log('Signature position deleted successfully');
      } else {
        console.error('Failed to delete signature position:', result.error);
        alert(`Delete failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting signature position:', error);
      alert('Delete failed, please try again');
    }
  };

  const handlePositionAdd = async (newPosition: Omit<SignaturePosition, 'id'>) => {
    if (recipients.length === 0) {
      alert('Please add recipients first');
      return;
    }

    if (!selectedRecipientId) {
      alert('Please select a recipient for the signature position');
      return;
    }

    const selectedRecipient = recipients.find(r => r.id === selectedRecipientId);
    if (!selectedRecipient) {
      alert('Selected recipient not found');
      return;
    }

    // Create temporary position for immediate display
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const positionWithTempId: SignaturePosition = {
      ...newPosition,
      id: tempId,
      recipientId: selectedRecipient.id
    };

    // Add to local state immediately
    setSignaturePositions(prev => [...prev, positionWithTempId]);
    setSelectedPosition(positionWithTempId);

    // Save to database asynchronously
    try {
      setSavingPosition(true);
      
      const pdfContainer = document.querySelector('[data-pdf-container]') as HTMLElement;
      const containerRect = pdfContainer?.getBoundingClientRect();
      
      const createRequest: CreatePositionRequest = {
        recipientId: selectedRecipient.id,
        fileId: newPosition.fileId,
        pageNumber: newPosition.pageNumber,
        x: newPosition.x,
        y: newPosition.y,
        width: newPosition.width,
        height: newPosition.height,
        placeholderText: newPosition.placeholderText,
        pageWidth: Math.round(containerRect?.width || 800),
        pageHeight: Math.round(containerRect?.height || 600)
      };

      console.log('Saving signature position request:', createRequest);

      // 使用认证头直接调用API
      const headers = await getAuthHeaders();
      console.log('Request headers:', headers);
      
      const response = await fetch('/api/signature/positions', {
        method: 'POST',
        headers,
        body: JSON.stringify(createRequest)
      });

      const result = await response.json();
      console.log('API Response:', response.status, result);
      
      if (!response.ok) {
        console.error('API Error Response:', result);
        throw new Error(result.error || `HTTP ${response.status}: ${result.message || 'Unknown error'}`);
      }
      
      if (result.success && result.data) {
        // 处理API响应数据，转换为前端格式
        const savedPosition: SignaturePosition = {
          id: result.data.id,
          recipientId: result.data.recipient?.id || selectedRecipient.id,
          fileId: result.data.file?.id || newPosition.fileId,
          pageNumber: result.data.position?.pageNumber || newPosition.pageNumber,
          x: result.data.position?.coordinates?.percent?.x || newPosition.x,
          y: result.data.position?.coordinates?.percent?.y || newPosition.y,
          width: result.data.position?.coordinates?.percent?.width || newPosition.width,
          height: result.data.position?.coordinates?.percent?.height || newPosition.height,
          placeholderText: result.data.placeholderText || newPosition.placeholderText,
          status: result.data.status || 'pending'
        };

        // Replace temporary position with real one
        setSignaturePositions(prev => 
          prev.map(p => p.id === tempId ? savedPosition : p)
        );
        setSelectedPosition(savedPosition);
        console.log('Signature position saved successfully:', savedPosition);
      } else {
        // Save failed, remove temporary position
        setSignaturePositions(prev => prev.filter(p => p.id !== tempId));
        setSelectedPosition(null);
        console.error('Failed to save signature position:', result.error);
        alert(`Save failed: ${result.error}`);
      }
    } catch (error) {
      // Network error, remove temporary position
      setSignaturePositions(prev => prev.filter(p => p.id !== tempId));
      setSelectedPosition(null);
      console.error('Error saving signature position:', error);
      
      // More helpful error message
      if (error instanceof Error && error.message.includes('签字位置冲突')) {
        alert(`Cannot add signature here: ${error.message}\n\nTip: You can:\n1. Choose a different location\n2. Delete existing signature positions\n3. Select a different recipient`);
      } else {
        alert('Save failed, please check network connection');
      }
    } finally {
      setSavingPosition(false);
    }
  };

  // Drag handling
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const handleDragStart = (itemType: string) => {
    console.log(`[Page] handleDragStart called with type: ${itemType}`);
    setDraggedItem(itemType);
  };

  const handleDragEnd = () => {
    console.log(`[Page] handleDragEnd called, clearing draggedItem`);
    setDraggedItem(null);
  };

  // Show loading while Clerk is initializing or while data is loading
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!isLoaded ? 'Initializing...' : 'Loading PDF signature setup...'}
          </p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated (this should be handled by the useEffect above)
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please sign in to access this page</p>
          <Button onClick={() => router.push('/sign-in')} variant="outline">
            Sign In
          </Button>
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
          <Button onClick={handleGoBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation bar */}
      <TopBar
        taskTitle={task?.title || 'Unknown Task'}
        onGoBack={handleGoBack}
        onSave={handleSavePositions}
        onSendEmails={handleSendEmails}
        isSaving={saving || savingPosition}
        isSending={sending}
      />

      {/* Main content area */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left sidebar: Drag controls toolbar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          {/* Save status indicator */}
          {(saving || savingPosition) && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent mr-2"></div>
                {saving ? 'Saving all positions...' : 'Saving new position...'}
              </div>
            </div>
          )}

          {/* Loading positions indicator */}
          {loadingPositions && (
            <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent mr-2"></div>
                Loading existing positions...
              </div>
            </div>
          )}

          {/* 使用新的拖拽组件 */}
          <DragWidgetsGroup
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
          
          {/* 测试拖拽区域 */}
          
          {/* 调试工具 */}
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Debug Tools</h4>
            <button
              onClick={async () => {
                try {
                  const headers = await getAuthHeaders();
                  const response = await fetch(`/api/test/list-positions?taskId=${taskId}`, {
                    headers
                  });
                  const data = await response.json();
                  console.log('All positions:', data);
                  alert(`Total positions: ${data.totalPositions}\nCheck console for details`);
                } catch (error) {
                  console.error('Failed to list positions:', error);
                }
              }}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded mr-2"
            >
              List All Positions
            </button>
            <button
              onClick={async () => {
                if (confirm('Delete ALL positions for this task?')) {
                  try {
                    const headers = await getAuthHeaders();
                    const response = await fetch(`/api/test/list-positions?taskId=${taskId}`, {
                      method: 'DELETE',
                      headers
                    });
                    const data = await response.json();
                    console.log('Delete result:', data);
                    alert(`Deleted ${data.deletedCount} positions`);
                    // Reload positions
                    await loadSignaturePositions();
                  } catch (error) {
                    console.error('Failed to delete positions:', error);
                  }
                }
              }}
              className="text-xs bg-red-500 text-white px-2 py-1 rounded"
            >
              Clear All Positions
            </button>
          </div>

          <h3 className="text-sm font-medium text-gray-900 mb-3 mt-6">Recipients</h3>
          <p className="text-xs text-gray-500 mb-2">Select a recipient to assign signature positions</p>
          <div className="space-y-2">
            {recipients.map((recipient) => (
              <div 
                key={recipient.id} 
                className={`p-3 border rounded transition-colors cursor-pointer ${
                  selectedRecipientId === recipient.id
                    ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedRecipientId(recipient.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{recipient.name}</div>
                    <div className="text-xs text-gray-500">{recipient.email}</div>
                    <div className="text-xs text-blue-600 mt-1">{recipient.status}</div>
                  </div>
                  {selectedRecipientId === recipient.id && (
                    <div className="text-teal-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {selectedRecipientId === recipient.id && (
                  <div className="mt-2 text-xs text-teal-700 bg-teal-50 px-2 py-1 rounded">
                    Currently selected: New signature positions will be assigned to this recipient
                  </div>
                )}
              </div>
            ))}
            {recipients.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">No recipients</div>
            )}
          </div>

          {/* File switcher for multiple files */}
          {files.length > 1 && (
            <>
              <h3 className="text-sm font-medium text-gray-900 mb-3 mt-6">Files</h3>
              <div className="space-y-2">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleFileChange(file.id)}
                    className={`w-full text-left p-3 rounded text-xs transition-colors ${
                      currentFileId === file.id
                        ? 'bg-teal-50 border border-teal-200 text-teal-700'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium truncate">
                      {file.displayName || file.originalFilename}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Center: PDF display area */}
        <div className="flex-1 flex flex-col">
          {/* Show current recipient info */}
          {selectedRecipientId && recipients.length > 0 && (
            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-gray-600">Currently placing signatures for: </span>
                  <span className="font-medium text-blue-700">
                    {recipients.find(r => r.id === selectedRecipientId)?.name}
                  </span>
                  <span className="text-gray-500 ml-2">
                    ({signaturePositions.filter(p => p.recipientId === selectedRecipientId).length} positions)
                  </span>
                </div>
                {signaturePositions.filter(p => p.recipientId === selectedRecipientId).length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Delete all positions for this recipient?')) {
                        const positionsToDelete = signaturePositions.filter(p => p.recipientId === selectedRecipientId);
                        positionsToDelete.forEach(p => {
                          if (p.id) handlePositionDelete(p.id);
                        });
                      }
                    }}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          )}
          
        <SimplePDFViewer
          files={files}
          recipients={recipients}
          currentFileId={currentFileId}
          currentPageNumber={currentPageNumber}
          positions={convertToComponentPositions(signaturePositions.filter(p => p.fileId === currentFileId))}
          selectedPosition={selectedPosition ? convertToComponentPosition(selectedPosition) : null}
          selectedRecipientId={selectedRecipientId}
          draggedWidgetType={draggedItem}
          onPositionSelect={(position) => {
            if (position) {
              const apiPosition = convertToApiPosition({...position});
              handlePositionSelect({...apiPosition, fileId: currentFileId});
            } else {
              handlePositionSelect(null);
            }
          }}
          onPositionUpdate={(position) => {
            const apiPosition = convertToApiPosition({...position});
            handlePositionUpdate({...apiPosition, fileId: currentFileId});
          }}
          onPositionDelete={handlePositionDelete}
          onPositionAdd={(position) => {
            const apiPosition = convertToApiPosition({...position});
            handlePositionAdd({...apiPosition, fileId: currentFileId});
          }}
          onPageChange={handlePageChange}
          onDragEnd={handleDragEnd}
        />
        </div>

        {/* Right sidebar: Properties panel */}
        <div className="w-80 bg-white border-l border-gray-200 p-4">
          {selectedPosition ? (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Position Properties</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Placeholder Text
                  </label>
                  <input
                    type="text"
                    value={selectedPosition.placeholderText || ''}
                    onChange={(e) => {
                      const updated = { ...selectedPosition, placeholderText: e.target.value };
                      setSelectedPosition(updated);
                      handlePositionUpdate(updated);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Enter placeholder text"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Width</label>
                    <input
                      type="number"
                      value={selectedPosition.width}
                      onChange={(e) => {
                        const updated = { ...selectedPosition, width: parseInt(e.target.value) };
                        setSelectedPosition(updated);
                        handlePositionUpdate(updated);
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Height</label>
                    <input
                      type="number"
                      value={selectedPosition.height}
                      onChange={(e) => {
                        const updated = { ...selectedPosition, height: parseInt(e.target.value) };
                        setSelectedPosition(updated);
                        handlePositionUpdate(updated);
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-sm">Select a signature position</div>
              <div className="text-xs mt-1">Click on a signature box in the PDF to edit properties</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 