'use client';

import React from 'react';
import { ArrowLeft, Save, Send, FileText, Users } from 'lucide-react';

interface PDFHeaderProps {
  taskTitle: string;
  fileCount: number;
  recipientCount: number;
  isSaving: boolean;
  isSending: boolean;
  onGoBack: () => void;
  onSave: () => void;
  onSend: () => void;
}

const PDFHeader: React.FC<PDFHeaderProps> = ({
  taskTitle,
  fileCount,
  recipientCount,
  isSaving,
  isSending,
  onGoBack,
  onSave,
  onSend
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* 左侧：返回按钮和标题 */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onGoBack}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          
          <div className="border-l border-gray-300 h-6"></div>
          
          <div>
            <h1 className="text-lg font-semibold text-gray-900 line-clamp-1">
              {taskTitle || 'Untitled Document'}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
              <div className="flex items-center space-x-1">
                <FileText className="w-4 h-4" />
                <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>
          
          <button
            onClick={onSend}
            disabled={isSending || recipientCount === 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4 mr-2" />
            <span>{isSending ? 'Sending...' : 'Send for Signature'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFHeader;