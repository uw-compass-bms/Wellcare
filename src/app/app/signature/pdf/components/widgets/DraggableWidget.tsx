'use client';

import React from 'react';
import { WidgetTemplate } from '../../types';

interface DraggableWidgetProps {
  template: WidgetTemplate;
  onDragStart: (type: string) => void;
  onDragEnd: () => void;
}

const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  template,
  onDragStart,
  onDragEnd
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', template.type);
    e.dataTransfer.effectAllowed = 'copy';
    
    // 创建拖拽预览
    const dragImage = document.createElement('div');
    dragImage.textContent = `${template.icon} ${template.label}`;
    dragImage.style.cssText = `
      position: absolute;
      top: -1000px;
      padding: 8px 12px;
      background: ${template.color};
      border-radius: 6px;
      color: white;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // 清理拖拽预览
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
    
    onDragStart(template.type);
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="group cursor-move p-3 rounded-lg border-2 border-transparent hover:border-gray-200 transition-all duration-200 hover:scale-105 active:scale-95 select-none"
      style={{ backgroundColor: `${template.color}15` }}
    >
      <div className="flex items-center space-x-3">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
          style={{ backgroundColor: template.color }}
        >
          {template.icon}
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">{template.label}</div>
          <div className="text-xs text-gray-500">Drag to PDF</div>
        </div>
      </div>
    </div>
  );
};

export default DraggableWidget;