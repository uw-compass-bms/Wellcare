import React, { useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

interface DraftsComponentProps {
  tasks: SignatureTask[];
  onRefresh: () => void;
}

export default function DraftsComponent({ tasks, onRefresh }: DraftsComponentProps) {
  // 筛选草稿任务
  const draftTasks = tasks.filter(task => task.status === 'draft');

  const router = useRouter(); // 注入router
  const [deletingTask, setDeletingTask] = useState<string | null>(null);

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // 移动到垃圾箱
  const handleMoveToTrash = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Are you sure you want to move "${taskTitle}" to trash?`)) {
      return;
    }

    setDeletingTask(taskId);
    try {
      const response = await fetch(`/api/signature/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled'  // Using 'cancelled' as trash temporarily
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to move to trash');
      }

      // 刷新任务列表
      onRefresh();
    } catch (error) {
      console.error('Move to trash error:', error);
      alert(error instanceof Error ? error.message : 'Failed to move to trash');
    } finally {
      setDeletingTask(null);
    }
  };


  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Transaction name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Recipients
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Activity
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {draftTasks.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                No draft transactions.
              </td>
            </tr>
          ) : (
            draftTasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-900 font-medium">
                    {task.title}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className="text-gray-400">Recipients data pending</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(task.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(task.updated_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    Draft
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleMoveToTrash(task.id, task.title)}
                      disabled={deletingTask === task.id}
                      className="text-red-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded"
                      title="Move to trash"
                    >
                      {deletingTask === task.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                    <button 
                      onClick={() => router.push(`/app/signature/create-task/${task.id}`)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded"
                      title="Edit task"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
