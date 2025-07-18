'use client';

import React from 'react';
import { ArrowLeft, Save, Send } from 'lucide-react';

interface TopBarProps {
  taskTitle: string;
  onGoBack: () => void;
  onSave: () => void;
  onSendEmails: () => void;
  isSaving: boolean;
  isSending: boolean;
}

const TopBar: React.FC<TopBarProps> = ({
  taskTitle,
  onGoBack,
  onSave,
  onSendEmails,
  isSaving,
  isSending
}) => {
  return (
    <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      {/* Left: Back Button and Title */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onGoBack}
          className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <div className="border-l border-gray-300 h-6"></div>
        <h1 className="text-lg font-semibold text-gray-900">
          Setup Signatures: {taskTitle}
        </h1>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Draft'}
        </button>
        
        <button
          onClick={onSendEmails}
          disabled={isSending}
          className="flex items-center px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded disabled:opacity-50"
        >
          <Send className="w-4 h-4 mr-2" />
          {isSending ? 'Sending...' : 'Send Emails'}
        </button>
      </div>
    </div>
  );
};

export default TopBar; 