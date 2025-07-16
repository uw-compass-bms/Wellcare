import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface NewTransactionProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (taskId: string) => void; // 传递新建任务id
}

export default function NewTransactionDialog({ isOpen, onClose, onSuccess }: NewTransactionProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 表单校验
  const validate = () => {
    if (!title.trim()) return "Title is required.";
    if (title.length > 200) return "Title must be at most 200 characters.";
    return null;
  };

  // 提交创建任务
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/signature/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          description: description || undefined
        })
      });
      
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.message || "Failed to create task");
      
      setSuccess(true);
      setTitle("");
      setDescription("");
      onSuccess(result.data.id); // 创建成功后传递id
      
      // 1.5秒后关闭对话框
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  // 关闭对话框时重置表单
  const handleClose = () => {
    if (!loading) {
      setTitle("");
      setDescription("");
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create New Transaction</h3>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleCreateTask} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              required
              disabled={loading}
              placeholder="Enter transaction title"
            />
            <div className="text-xs text-gray-500 mt-1">{title.length}/200</div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors resize-none"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              disabled={loading}
              placeholder="Optional: add a description for this transaction"
            />
          </div>

          {error && (
            <div className="flex items-start text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-3">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="flex items-start text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-3">
              <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>Transaction created successfully!</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              disabled={loading}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="bg-teal-600 hover:bg-teal-700 min-w-[80px]"
            >
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
