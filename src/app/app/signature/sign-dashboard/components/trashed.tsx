import React, { useState } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { Toast } from '@/lib/utils/toast';

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

interface TrashedComponentProps {
  tasks: SignatureTask[];
  onRefresh: () => void;
}

export default function TrashedComponent({ tasks, onRefresh }: TrashedComponentProps) {
  // 筛选已删除任务
  const trashedTasks = tasks.filter(task => task.status === 'cancelled');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // 永久删除任务
  const handlePermanentDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to permanently delete this task? This action cannot be undone.')) {
      return;
    }

    setDeletingId(taskId);
    try {
      const response = await fetch(`/api/signature/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      Toast.success('Task permanently deleted');
      onRefresh();
    } catch (error) {
      Toast.error('Failed to delete task');
    } finally {
      setDeletingId(null);
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
              Deleted Date
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
          {trashedTasks.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                No trashed transactions.
              </td>
            </tr>
          ) : (
            trashedTasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-600 font-medium">
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
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    Trashed
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button 
                    onClick={() => handlePermanentDelete(task.id)}
                    disabled={deletingId === task.id}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                    title="Permanently delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
