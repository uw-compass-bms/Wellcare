'use client';

import React from 'react';
import { WidgetPropertiesProps } from '../../types';
import { getWidgetTemplate } from '../widgets/widget-templates';
import { Trash2, Move, Maximize2 } from 'lucide-react';

const WidgetPropertiesPanel: React.FC<WidgetPropertiesProps> = ({
  widget,
  recipient,
  onUpdate,
  onDelete
}) => {
  if (!widget) {
    return (
      <div className="w-72 bg-white border-l border-gray-200 p-6 flex flex-col items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Move className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">No Field Selected</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Click on a signature field in the PDF to edit its properties, or drag a new field from the left panel.
          </p>
        </div>
      </div>
    );
  }

  const template = getWidgetTemplate(widget.type);

  const handleInputChange = (field: string, value: any) => {
    onUpdate({ [field]: value });
  };

  return (
    <div className="w-72 bg-white border-l border-gray-200 p-6 flex flex-col h-full">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-gray-900">Field Properties</h3>
        <button
          onClick={onDelete}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete field"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 基础信息 */}
      <div className="space-y-6">
        {/* Widget类型 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Field Type
          </label>
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
              style={{ backgroundColor: template.color }}
            >
              {template.icon}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{template.label}</div>
              <div className="text-xs text-gray-500">ID: {widget.id.slice(-8)}</div>
            </div>
          </div>
        </div>

        {/* 收件人信息 */}
        {recipient && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Assigned To
            </label>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900">{recipient.name}</div>
              <div className="text-xs text-blue-600">{recipient.email}</div>
            </div>
          </div>
        )}

        {/* 占位符文本 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Placeholder Text
          </label>
          <input
            type="text"
            value={widget.placeholder}
            onChange={(e) => handleInputChange('placeholder', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter placeholder text"
          />
        </div>

        {/* 当前值 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Current Value
          </label>
          <input
            type="text"
            value={widget.value}
            onChange={(e) => handleInputChange('value', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Current field value"
          />
        </div>

        {/* 位置和尺寸 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-3">
            Position & Size
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">X Position (%)</label>
              <input
                type="number"
                value={Math.round(widget.x * 10) / 10}
                onChange={(e) => handleInputChange('x', Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Y Position (%)</label>
              <input
                type="number"
                value={Math.round(widget.y * 10) / 10}
                onChange={(e) => handleInputChange('y', Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Width (%)</label>
              <input
                type="number"
                value={Math.round(widget.width * 10) / 10}
                onChange={(e) => handleInputChange('width', Math.max(1, Math.min(100, Number(e.target.value))))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="1"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Height (%)</label>
              <input
                type="number"
                value={Math.round(widget.height * 10) / 10}
                onChange={(e) => handleInputChange('height', Math.max(1, Math.min(100, Number(e.target.value))))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                min="1"
                max="100"
                step="0.1"
              />
            </div>
          </div>
        </div>

        {/* 页面信息 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Page Location
          </label>
          <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
            <span className="text-sm text-gray-600">Page {widget.page}</span>
          </div>
        </div>

        {/* 必填选项 */}
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={widget.isRequired || false}
              onChange={(e) => handleInputChange('isRequired', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-xs font-medium text-gray-700">Required field</span>
          </label>
        </div>
      </div>

      {/* 操作提示 */}
      <div className="mt-auto pt-6 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-2">
          <div className="flex items-center space-x-2">
            <Move className="w-3 h-3" />
            <span>Drag to reposition</span>
          </div>
          <div className="flex items-center space-x-2">
            <Maximize2 className="w-3 h-3" />
            <span>Drag corners to resize</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetPropertiesPanel;