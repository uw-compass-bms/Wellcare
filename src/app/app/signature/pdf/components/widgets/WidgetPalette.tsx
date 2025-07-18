'use client';

import React from 'react';
import DraggableWidget from './DraggableWidget';
import { WidgetPaletteProps } from '../../types';

const WidgetPalette: React.FC<WidgetPaletteProps> = ({
  templates,
  selectedRecipient,
  onDragStart,
  onDragEnd
}) => {
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col h-full">
      {/* 标题 */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Signature Fields</h3>
        <p className="text-xs text-gray-500">Drag fields to place on the PDF</p>
      </div>

      {/* Widget列表 */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {templates.map((template) => (
          <DraggableWidget
            key={template.type}
            template={template}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>

      {/* 当前收件人信息 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-xs font-medium text-blue-900 mb-1">Current Recipient:</div>
        <div className="text-sm text-blue-800">{selectedRecipient.name}</div>
        <div className="text-xs text-blue-600">{selectedRecipient.email}</div>
      </div>

      {/* 使用提示 */}
      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <div className="flex items-center space-x-2">
          <span>•</span>
          <span>Drag fields to PDF</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>•</span>
          <span>Click to select widgets</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>•</span>
          <span>Double-click to edit text</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>•</span>
          <span>Drag handles to resize</span>
        </div>
      </div>
    </div>
  );
};

export default WidgetPalette;