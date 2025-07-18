'use client';

import React from 'react';
import { RecipientInfo } from '../../types';

interface RecipientSelectorProps {
  recipients: RecipientInfo[];
  selectedRecipient: RecipientInfo;
  onRecipientSelect: (recipient: RecipientInfo) => void;
  className?: string;
}

const RecipientSelector: React.FC<RecipientSelectorProps> = ({
  recipients,
  selectedRecipient,
  onRecipientSelect,
  className = ''
}) => {
  if (recipients.length <= 1) {
    return null;
  }

  // 为每个收件人分配颜色
  const getRecipientColor = (index: number) => {
    const colors = [
      '#3B82F6', // blue
      '#EF4444', // red  
      '#10B981', // green
      '#F59E0B', // amber
      '#8B5CF6', // violet
      '#06B6D4', // cyan
      '#EC4899', // pink
      '#84CC16'  // lime
    ];
    return colors[index % colors.length];
  };

  return (
    <div className={`bg-white border-b border-gray-200 px-6 py-3 ${className}`}>
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-gray-700">
          Placing fields for:
        </span>
        
        <div className="flex items-center space-x-2">
          {recipients.map((recipient, index) => {
            const isSelected = selectedRecipient.id === recipient.id;
            const color = getRecipientColor(index);
            
            return (
              <button
                key={recipient.id}
                onClick={() => onRecipientSelect(recipient)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? 'text-white shadow-md scale-105'
                    : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
                style={{
                  backgroundColor: isSelected ? color : undefined,
                }}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: isSelected ? 'white' : color }}
                  />
                  <span>{recipient.name}</span>
                </div>
              </button>
            );
          })}
        </div>
        
        {/* 当前选中收件人的详细信息 */}
        <div className="flex-1 text-right">
          <div className="text-sm text-gray-600">
            {selectedRecipient.email}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipientSelector;