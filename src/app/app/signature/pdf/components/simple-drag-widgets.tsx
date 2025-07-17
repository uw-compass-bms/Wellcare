'use client';

import React from 'react';

export interface DragWidgetProps {
  type: string;
  label: string;
  icon: string;
  color: string;
  onDragStart?: (type: string) => void;
  onDragEnd?: () => void;
}

export const DragWidget: React.FC<DragWidgetProps> = ({
  type,
  label,
  icon,
  color,
  onDragStart,
  onDragEnd
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    // 设置拖拽数据
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
    
    // 创建拖拽图像
    const dragImage = document.createElement('div');
    dragImage.textContent = `${icon} ${label}`;
    dragImage.style.cssText = `
      position: absolute;
      top: -1000px;
      padding: 8px 12px;
      background: ${color};
      border-radius: 6px;
      color: white;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // 清理拖拽图像
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
    
    onDragStart?.(type);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        p-3 rounded-lg cursor-move transition-all duration-200
        border-2 border-transparent
        hover:scale-105 hover:shadow-md
        active:scale-95
        select-none
      `}
      style={{ backgroundColor: color }}
    >
      <div className="flex items-center space-x-2 text-white">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-xs text-white/80 mt-1">
        Drag to PDF
      </div>
    </div>
  );
};

export interface DragWidgetsGroupProps {
  onDragStart?: (type: string) => void;
  onDragEnd?: () => void;
}

export const DragWidgetsGroup: React.FC<DragWidgetsGroupProps> = ({
  onDragStart,
  onDragEnd
}) => {
  const widgets = [
    {
      type: 'signature',
      label: 'Signature',
      icon: '✍️',
      color: '#3B82F6' // blue-500
    },
    {
      type: 'date',
      label: 'Date',
      icon: '📅',
      color: '#10B981' // green-500
    },
    {
      type: 'text',
      label: 'Text',
      icon: '📝',
      color: '#F59E0B' // yellow-500
    },
    {
      type: 'checkbox',
      label: 'Checkbox',
      icon: '☑️',
      color: '#8B5CF6' // purple-500
    },
    {
      type: 'initials',
      label: 'Initials',
      icon: '🆔',
      color: '#EF4444' // red-500
    }
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Signature Controls
      </h3>
      <div className="space-y-2">
        {widgets.map((widget) => (
          <DragWidget
            key={widget.type}
            type={widget.type}
            label={widget.label}
            icon={widget.icon}
            color={widget.color}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded">
        💡 Tip: Drag controls to any position on the PDF document to place signature fields
      </div>
    </div>
  );
};

export default DragWidgetsGroup;