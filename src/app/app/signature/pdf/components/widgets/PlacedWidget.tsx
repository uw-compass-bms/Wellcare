'use client';

import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { Widget, RecipientInfo } from '../../types';
import { getWidgetTemplate } from './widget-templates';

interface PlacedWidgetProps {
  widget: Widget;
  recipient: RecipientInfo | undefined;
  isSelected: boolean;
  scale: number;
  containerWidth: number;
  containerHeight: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<Widget>) => void;
  onDelete: () => void;
  onDoubleClick?: () => void;
  readOnly?: boolean;
}

const PlacedWidget: React.FC<PlacedWidgetProps> = ({
  widget,
  recipient,
  isSelected,
  scale,
  containerWidth,
  containerHeight,
  onSelect,
  onUpdate,
  onDelete,
  onDoubleClick,
  readOnly = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const template = getWidgetTemplate(widget.type);
  
  // 转换百分比到像素
  const pixelX = (widget.x / 100) * containerWidth;
  const pixelY = (widget.y / 100) * containerHeight;
  const pixelWidth = (widget.width / 100) * containerWidth;
  const pixelHeight = (widget.height / 100) * containerHeight;

  const handleDoubleClick = () => {
    if (readOnly) return;
    
    if (widget.type === 'text' || widget.type === 'name' || widget.type === 'email') {
      setIsEditing(true);
      setEditValue(widget.placeholder);
      onDoubleClick?.();
    }
  };

  const completeEditing = () => {
    if (editValue.trim()) {
      onUpdate({ placeholder: editValue.trim() });
    }
    setIsEditing(false);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      completeEditing();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue('');
    }
  };

  const borderColor = isSelected ? template.color : '#93C5FD';
  const backgroundColor = isSelected 
    ? `${template.color}20` 
    : `${template.color}10`;

  return (
    <Rnd
      size={{ width: pixelWidth, height: pixelHeight }}
      position={{ x: pixelX, y: pixelY }}
      scale={scale}
      onDragStop={(e, d) => {
        if (readOnly) return;
        const newX = Math.max(0, Math.min(100 - widget.width, (d.x / containerWidth) * 100));
        const newY = Math.max(0, Math.min(100 - widget.height, (d.y / containerHeight) * 100));
        onUpdate({ x: newX, y: newY });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        if (readOnly) return;
        const newWidth = Math.max(template.minSize?.width || 5, (ref.offsetWidth / containerWidth) * 100);
        const newHeight = Math.max(template.minSize?.height || 3, (ref.offsetHeight / containerHeight) * 100);
        const newX = Math.max(0, (position.x / containerWidth) * 100);
        const newY = Math.max(0, (position.y / containerHeight) * 100);
        
        onUpdate({
          x: newX,
          y: newY,
          width: Math.min(newWidth, 100 - newX),
          height: Math.min(newHeight, 100 - newY)
        });
      }}
      bounds="parent"
      enableResizing={isSelected && !readOnly}
      disableDragging={readOnly}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      className={`widget-rnd ${isSelected ? 'selected' : ''}`}
      style={{
        border: `2px solid ${borderColor}`,
        backgroundColor,
        borderRadius: '4px',
        cursor: readOnly ? 'default' : 'move',
        zIndex: isSelected ? 10 : 1,
      }}
    >
      <div className="h-full flex items-center justify-center p-1 relative">
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={completeEditing}
            onKeyDown={handleKeyDown}
            className="w-full h-full text-xs border-none outline-none bg-transparent text-center"
            autoFocus
            style={{ fontSize: Math.min(12, pixelHeight * 0.4) }}
          />
        ) : (
          <div className="text-center w-full">
            <div 
              className="font-medium truncate"
              style={{ 
                fontSize: Math.min(12, pixelHeight * 0.4),
                color: template.color 
              }}
            >
              {widget.value || widget.placeholder}
            </div>
          </div>
        )}

        {/* Widget控制按钮 */}
        {isSelected && !readOnly && (
          <>
            {/* 删除按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              ×
            </button>
            
            {/* Widget信息标签 */}
            <div className="absolute -top-6 left-0 bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              {template.label}
              {recipient && ` - ${recipient.name}`}
            </div>
          </>
        )}
      </div>
    </Rnd>
  );
};

export default PlacedWidget;