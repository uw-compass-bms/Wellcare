'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Send } from 'lucide-react';
import dynamic from 'next/dynamic';

// 导入组件
import TopBar from '../components/topbar';

// 使用简单的PDF查看器，避免react-pdf的SSR问题
const PDFViewer = dynamic(() => import('../components/simple-pdf-viewer'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading PDF Viewer...</p>
      </div>
    </div>
  )
});

// 简化类型定义
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
  // 数据库原始字段名
  original_filename?: string;
  display_name?: string;
  original_file_url?: string;
  file_size?: number;
  uploaded_at?: string;
}

interface RecipientInfo {
  id: string;
  name: string;
  email: string;
  status: string;
  token: string;
  expires_at: string;
}

interface SignaturePosition {
  id?: string;
  recipientId: string;
  fileId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  placeholderText?: string;
}

export default function PDFSignaturePage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<TaskInfo | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [recipients, setRecipients] = useState<RecipientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // PDF 查看状态
  const [currentFileId, setCurrentFileId] = useState<string>('');
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [signaturePositions, setSignaturePositions] = useState<SignaturePosition[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<SignaturePosition | null>(null);

  // 加载任务数据
  useEffect(() => {
    loadTaskData();
  }, [taskId]);

  // 文件变化时重置页码
  useEffect(() => {
    if (files.length > 0 && !currentFileId) {
      setCurrentFileId(files[0].id);
      setCurrentPageNumber(1);
    }
  }, [files, currentFileId]);

  const loadTaskData = async () => {
    try {
      // 并行加载任务信息、文件和接收者
      const [taskResponse, recipientsResponse] = await Promise.all([
        fetch(`/api/signature/tasks/${taskId}`),
        fetch(`/api/signature/tasks/${taskId}/recipients`)
      ]);

      if (taskResponse.ok) {
        const taskData = await taskResponse.json();
        setTask(taskData.task);
        // 处理文件数据，确保包含必需字段
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

  // 处理函数
  const handleGoBack = () => {
    router.push('/app/signature');
  };

  const handleSavePositions = async () => {
    setSaving(true);
    try {
      console.log('Saving positions...');
      // TODO: 实现保存逻辑
      setTimeout(() => {
        alert('Positions saved successfully');
        setSaving(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to save positions:', error);
      alert('Failed to save positions');
      setSaving(false);
    }
  };

  const handleSendEmails = async () => {
    setSending(true);
    try {
      console.log('Sending emails...');
      // TODO: 实现发送邮件逻辑
      setTimeout(() => {
        alert('Emails sent successfully');
        setSending(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to send emails:', error);
      alert('Failed to send emails');
      setSending(false);
    }
  };

  // PDF 相关处理函数
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
    setSignaturePositions(prev => 
      prev.map(p => p.id === position.id ? position : p)
    );
  };

  const handlePositionDelete = (positionId: string) => {
    setSignaturePositions(prev => 
      prev.filter(p => p.id !== positionId)
    );
    setSelectedPosition(null);
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
      {/* 顶部操作栏 */}
      <TopBar
        taskTitle={task?.title || 'Unknown Task'}
        onGoBack={handleGoBack}
        onSave={handleSavePositions}
        onSendEmails={handleSendEmails}
        isSaving={saving}
        isSending={sending}
      />

      {/* 主内容区域 */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* 左侧：拖拽控件工具栏 */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Signature Controls</h3>
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              ✍️ Signature (Drag to PDF)
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              📅 Date (Drag to PDF)
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
              📝 Text (Drag to PDF)
            </div>
          </div>

          <h3 className="text-sm font-medium text-gray-900 mb-3 mt-6">Recipients</h3>
          <div className="space-y-2">
            {recipients.map((recipient) => (
              <div key={recipient.id} className="p-3 bg-gray-50 border border-gray-200 rounded">
                <div className="text-sm font-medium text-gray-900">{recipient.name}</div>
                <div className="text-xs text-gray-500">{recipient.email}</div>
                <div className="text-xs text-blue-600 mt-1">{recipient.status}</div>
              </div>
            ))}
            {recipients.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-4">No recipients</div>
            )}
          </div>

          {/* 文件切换 */}
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

        {/* 中间：PDF显示区域 */}
        <PDFViewer
          files={files}
          currentFileId={currentFileId}
          currentPageNumber={currentPageNumber}
          positions={signaturePositions}
          selectedPosition={selectedPosition}
          onPositionSelect={handlePositionSelect}
          onPositionUpdate={handlePositionUpdate}
          onPositionDelete={handlePositionDelete}
        />

        {/* 右侧：属性面板 */}
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