"use client";
import { useState, useEffect } from "react";
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

// 导入分页组件
import ProcessingComponent from './sign-dashboard/components/processing';
import DraftsComponent from './sign-dashboard/components/drafts';
import CompletedComponent from './sign-dashboard/components/completed';
import TrashedComponent from './sign-dashboard/components/trashed';

// 导入创建任务对话框
import NewTransactionDialog from './create-task/components/new-transaction';

// 任务类型定义
interface SignatureTask {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled' | 'trashed';
  created_at: string;
  updated_at: string;
  sent_at?: string;
  completed_at?: string;
}

type TabType = 'inbox' | 'drafts' | 'completed' | 'trashed';

export default function SignatureDashboard() {
  // 分页状态
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  
  // 创建任务对话框状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // 任务列表状态（所有分页共享）
  const [tasks, setTasks] = useState<SignatureTask[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 获取任务列表
  const fetchTasks = async () => {
    setListLoading(true);
    try {
      const res = await fetch("/api/signature/tasks");
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || 'Failed to fetch tasks');
      setTasks(result.data || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [refreshTrigger]);

  // 刷新任务列表
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 分页配置
  const tabs = [
    { key: 'inbox' as TabType, label: 'Inbox', count: tasks.filter(t => t.status !== 'cancelled').length },
    { key: 'drafts' as TabType, label: 'Drafts', count: tasks.filter(t => t.status === 'draft').length },
    { key: 'completed' as TabType, label: 'Completed', count: tasks.filter(t => t.status === 'completed').length },
    { key: 'trashed' as TabType, label: 'Trashed', count: tasks.filter(t => t.status === 'cancelled').length },
  ];

  const router = useRouter();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 顶部操作区 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          NEW TRANSACTION
        </Button>
      </div>

      {/* 分页标签 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`${
                activeTab === tab.key
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label} {tab.count > 0 && <span className="ml-1 text-xs bg-gray-100 px-2 py-1 rounded-full">{tab.count}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* 分页内容 */}
      <div className="bg-white">
        {listLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : (
          <>
            {activeTab === 'inbox' && <ProcessingComponent tasks={tasks} onRefresh={handleRefresh} />}
            {activeTab === 'drafts' && <DraftsComponent tasks={tasks} onRefresh={handleRefresh} />}
            {activeTab === 'completed' && <CompletedComponent tasks={tasks} onRefresh={handleRefresh} />}
            {activeTab === 'trashed' && <TrashedComponent tasks={tasks} onRefresh={handleRefresh} />}
          </>
        )}
      </div>

      {/* 创建任务对话框 */}
      <NewTransactionDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={(taskId) => {
          setShowCreateDialog(false);
          router.push(`/app/signature/create-task/${taskId}`);
        }}
      />
    </div>
  );
}
