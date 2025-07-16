'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Upload, Users, Send, Save, CheckCircle, AlertCircle } from 'lucide-react';
import DocumentUpload from '../components/document-upload';
import Recipients from '../components/recipients';

interface TaskInfo {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
}

interface FileInfo {
  id: string;
  originalFilename: string;
  displayName: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
}

interface RecipientInfo {
  id: string;
  name: string;
  email: string;
  status: string;
  token: string;
  expires_at: string;
}

export default function TaskConfigurationPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<TaskInfo | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [recipients, setRecipients] = useState<RecipientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 加载任务信息
  useEffect(() => {
    if (taskId) {
      loadTaskData();
    }
  }, [taskId]);

  const loadTaskData = async () => {
    try {
      setLoading(true);
      
      // 并行加载任务信息和收件人列表
      const [taskResponse, recipientsResponse] = await Promise.all([
        fetch(`/api/signature/tasks/${taskId}`),
        fetch(`/api/signature/tasks/${taskId}/recipients`)
      ]);

      if (taskResponse.ok) {
        const taskData = await taskResponse.json();
        setTask(taskData.task);
        setFiles(taskData.files || []); // 从task响应中获取files信息
      }

      if (recipientsResponse.ok) {
        const recipientsData = await recipientsResponse.json();
        setRecipients(recipientsData.data || []);
      }

    } catch (error) {
      console.error('加载任务数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理文件上传成功
  const handleFileUploaded = (fileInfo: FileInfo) => {
    setFiles(prev => [...prev, fileInfo]);
  };

  // 处理文件删除
  const handleFileDeleted = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // 处理收件人变化
  const handleRecipientsChanged = (newRecipients: RecipientInfo[]) => {
    setRecipients(newRecipients);
  };

  // 保存草稿
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      // 这里可以添加保存草稿的逻辑，比如更新任务状态等
      console.log('保存草稿');
      
      // 显示成功消息
      alert('Draft saved successfully');
    } catch (error) {
      console.error('保存草稿失败:', error);
      alert('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  // 进入签名位置设置
  const handleSetupSignatures = async () => {
    // 验证是否有文件和收件人
    if (files.length === 0) {
      alert('Please upload at least one file');
      return;
    }

    if (recipients.length === 0) {
      alert('Please add at least one recipient');
      return;
    }

    // 直接跳转到PDF签名位置配置页面
    router.push(`/app/signature/pdf/${taskId}`);
  };

  // 返回列表页
  const handleGoBack = () => {
    router.push('/app/signature');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading task information...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
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

  const canPublish = files.length > 0 && recipients.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{task.title}</h1>
                {task.description && (
                  <p className="text-sm text-gray-600">{task.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              
              <Button
                onClick={handleSetupSignatures}
                disabled={!canPublish}
                className="bg-teal-600 hover:bg-teal-700 text-white flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Setup Signatures
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* 状态信息 - 放在最上面，保持3列风格 */}
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{files.length}</div>
              <div className="text-sm text-gray-600">Files</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{recipients.length}</div>
              <div className="text-sm text-gray-600">Recipients</div>
            </div>
            <div>
              <div className={`text-lg font-semibold ${canPublish ? 'text-green-600' : 'text-amber-600'}`}>
                {canPublish ? 'Ready' : 'Pending'}
              </div>
              <div className="text-sm text-gray-600">Status</div>
            </div>
          </div>
        </div>

        {/* 文件上传和收件人管理区域 - 上下排列 */}
        <div className="space-y-8">
          {/* 文件上传 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="w-5 h-5 mr-2 text-teal-600" />
                File Upload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentUpload
                taskId={taskId}
                files={files}
                onFileUploaded={handleFileUploaded}
                onFileDeleted={handleFileDeleted}
              />
            </CardContent>
          </Card>

          {/* 收件人管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-teal-600" />
                Recipients Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Recipients
                taskId={taskId}
                recipients={recipients}
                onRecipientsChanged={handleRecipientsChanged}
              />
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
} 