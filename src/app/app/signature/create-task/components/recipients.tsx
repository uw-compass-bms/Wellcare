import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, User, Mail, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface RecipientInfo {
  id: string;
  name: string;
  email: string;
  status: string;
  token: string;
  expires_at: string;
}

interface Recipient {
  id: string;
  name: string;
  email: string;
}

interface RecipientsProps {
  taskId?: string;
  recipients?: RecipientInfo[];
  onRecipientsChanged?: (recipients: RecipientInfo[]) => void;
}

export default function RecipientsComponent({ taskId, recipients: initialRecipients = [], onRecipientsChanged }: RecipientsProps) {
  const [recipients, setRecipients] = useState<RecipientInfo[]>(initialRecipients);
  const [newRecipient, setNewRecipient] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // 同步外部传入的recipients
  useEffect(() => {
    setRecipients(initialRecipients);
  }, [initialRecipients]);

  // 校验邮箱格式
  const validateEmail = (email: string) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  // 添加收件人到后端
  const addRecipient = async () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!newRecipient.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!newRecipient.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(newRecipient.email)) {
      newErrors.email = 'Invalid email format';
    } else if (recipients.some(r => r.email === newRecipient.email)) {
      newErrors.email = 'Email already exists';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setAdding(true);
      try {
        const response = await fetch(`/api/signature/recipients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: taskId,
            name: newRecipient.name.trim(),
            email: newRecipient.email.trim(),
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const updatedRecipients = [...recipients, result.data];
          setRecipients(updatedRecipients);
          setNewRecipient({ name: '', email: '' });
          
          // 通知父组件
          onRecipientsChanged?.(updatedRecipients);
        } else {
          const error = await response.json();
          alert(`Failed to add recipient: ${error.error}`);
        }
      } catch (error) {
        console.error('添加收件人错误:', error);
        alert('Failed to add recipient');
      } finally {
        setAdding(false);
      }
    }
  };

  // 删除收件人
  const removeRecipient = async (recipientId: string) => {
    if (!confirm('Are you sure you want to remove this recipient?')) return;

    try {
      const response = await fetch(`/api/signature/recipients/${recipientId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedRecipients = recipients.filter(r => r.id !== recipientId);
        setRecipients(updatedRecipients);
        onRecipientsChanged?.(updatedRecipients);
      } else {
        const error = await response.json();
        alert(`Failed to remove recipient: ${error.error}`);
      }
    } catch (error) {
      console.error('删除收件人错误:', error);
      alert('Failed to remove recipient');
    }
  };

  // 清空错误
  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 格式化过期时间
  const formatExpiryDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 获取状态显示
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <div className="flex items-center text-yellow-600">
            <Clock className="w-4 h-4 mr-1" />
            <span className="text-sm">Pending</span>
          </div>
        );
      case 'viewed':
        return (
          <div className="flex items-center text-blue-600">
            <AlertCircle className="w-4 h-4 mr-1" />
            <span className="text-sm">Viewed</span>
          </div>
        );
      case 'signed':
        return (
          <div className="flex items-center text-green-600">
            <CheckCircle className="w-4 h-4 mr-1" />
            <span className="text-sm">Signed</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center text-gray-600">
            <AlertCircle className="w-4 h-4 mr-1" />
            <span className="text-sm">{status}</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 添加收件人表单 */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Recipient</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={`block w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              value={newRecipient.name}
              onChange={e => {
                setNewRecipient(prev => ({ ...prev, name: e.target.value }));
                clearError('name');
              }}
              placeholder="Enter recipient name"
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className={`block w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              value={newRecipient.email}
              onChange={e => {
                setNewRecipient(prev => ({ ...prev, email: e.target.value }));
                clearError('email');
              }}
              placeholder="Enter email address"
            />
            {errors.email && (
              <p className="text-xs text-red-600 mt-1">{errors.email}</p>
            )}
          </div>
        </div>

        <div className="mt-3">
          <Button
            onClick={addRecipient}
            disabled={adding || !newRecipient.name.trim() || !newRecipient.email.trim()}
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            {adding ? 'Adding...' : 'Add Recipient'}
          </Button>
        </div>
      </div>

      {/* 收件人列表 */}
      {recipients.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Recipients ({recipients.length})</h4>
          {recipients.map((recipient) => (
            <Card key={recipient.id} className="border border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-teal-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{recipient.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-1" />
                          <span>{recipient.email}</span>
                        </div>
                        {getStatusDisplay(recipient.status)}
                        <span>Expires: {formatExpiryDate(recipient.expires_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeRecipient(recipient.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 transition-colors"
                    title="Remove recipient"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {recipients.length === 0 && (
        <div className="text-center py-8">
          <User className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">No recipients added yet</p>
          <p className="text-sm text-gray-400 mt-1">Add recipients who need to sign the documents</p>
        </div>
      )}
    </div>
  );
}
