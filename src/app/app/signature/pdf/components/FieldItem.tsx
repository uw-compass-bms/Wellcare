'use client';

import React, { useState, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { Trash2, Calendar, Type, Hash, CheckSquare, Mail, User, X } from 'lucide-react';

export type FieldType = 'signature' | 'date' | 'text' | 'number' | 'checkbox' | 'email' | 'name';

export interface FieldMeta {
  // Text field metadata
  maxLength?: number;
  minLength?: number;
  multiline?: boolean;
  placeholder?: string;
  pattern?: string;
  
  // Date field metadata
  format?: string;
  minDate?: string;
  maxDate?: string;
  
  // Number field metadata
  min?: number;
  max?: number;
  
  // Signature field metadata
  penColor?: string;
  lineWidth?: number;
  
  // Checkbox metadata
  defaultChecked?: boolean;
  
  // Email validation
  validation?: string;
  
  // General
  label?: string;
  [key: string]: any;
}

export interface Field {
  id: string;
  type: FieldType;
  recipientId: string;
  pageNumber: number;
  x: number;      // 百分比坐标 0-100
  y: number;      // 百分比坐标 0-100
  width: number;   // 百分比宽度 0-100
  height: number;  // 百分比高度 0-100
  required?: boolean;
  placeholder?: string;
  fieldMeta?: FieldMeta;
  defaultValue?: string;
}

interface FieldItemProps {
  field: Field;
  pageWidth: number;
  pageHeight: number;
  isActive: boolean;
  onUpdate: (id: string, updates: Partial<Field>) => void;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
}

const fieldIcons = {
  signature: User,
  date: Calendar,
  text: Type,
  number: Hash,
  checkbox: CheckSquare,
  email: Mail,
  name: User,
};

const fieldColors = {
  signature: 'border-blue-500 bg-blue-50',
  date: 'border-green-500 bg-green-50',
  text: 'border-gray-500 bg-gray-50',
  number: 'border-purple-500 bg-purple-50',
  checkbox: 'border-pink-500 bg-pink-50',
  email: 'border-yellow-500 bg-yellow-50',
  name: 'border-indigo-500 bg-indigo-50',
};

/**
 * react-rnd字段组件，基于Documenso最佳实践
 * 使用百分比坐标系统，支持拖拽和调整大小
 */
export const FieldItem: React.FC<FieldItemProps> = ({
  field,
  pageWidth,
  pageHeight,
  isActive,
  onUpdate,
  onDelete,
  onActivate,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(field.defaultValue || '');
  
  // 百分比转像素
  const pixelX = (field.x / 100) * pageWidth;
  const pixelY = (field.y / 100) * pageHeight;
  const pixelWidth = (field.width / 100) * pageWidth;
  const pixelHeight = (field.height / 100) * pageHeight;

  // 像素转百分比
  const pixelsToPercentage = useCallback((pixelValue: number, dimension: number) => {
    return (pixelValue / dimension) * 100;
  }, []);

  const handleDragStop = useCallback((e: any, data: any) => {
    setIsDragging(false);
    const newX = pixelsToPercentage(data.x, pageWidth);
    const newY = pixelsToPercentage(data.y, pageHeight);
    onUpdate(field.id, { x: newX, y: newY });
  }, [field.id, pageWidth, pageHeight, pixelsToPercentage, onUpdate]);

  const handleResizeStop = useCallback((e: any, direction: any, ref: any, delta: any, position: any) => {
    const newWidth = pixelsToPercentage(ref.offsetWidth, pageWidth);
    const newHeight = pixelsToPercentage(ref.offsetHeight, pageHeight);
    const newX = pixelsToPercentage(position.x, pageWidth);
    const newY = pixelsToPercentage(position.y, pageHeight);
    
    onUpdate(field.id, {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });
  }, [field.id, pageWidth, pageHeight, pixelsToPercentage, onUpdate]);

  const handleDoubleClick = useCallback(() => {
    if (field.type === 'text' || field.type === 'name' || field.type === 'email' || field.type === 'number') {
      setIsEditing(true);
      setEditValue(field.defaultValue || '');
    }
  }, [field.type, field.defaultValue]);

  const handleEditComplete = useCallback(() => {
    if (isEditing) {
      onUpdate(field.id, { defaultValue: editValue });
      setIsEditing(false);
    }
  }, [isEditing, field.id, editValue, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditComplete();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(field.defaultValue || '');
    }
  }, [handleEditComplete, field.defaultValue]);

  const Icon = fieldIcons[field.type];
  const colorClass = fieldColors[field.type];

  return (
    <Rnd
      bounds={`[data-page-number="${field.pageNumber}"]`}
      position={{ x: pixelX, y: pixelY }}
      size={{ width: pixelWidth, height: pixelHeight }}
      onDragStart={() => setIsDragging(true)}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onMouseDown={(e) => {
        // Don't activate if clicking on delete button
        const target = e.target as HTMLElement;
        if (!target.closest('button')) {
          onActivate(field.id);
        }
      }}
      minWidth={80}
      minHeight={30}
      className={`field-item ${isDragging ? 'dragging' : ''}`}
      style={{ zIndex: isActive ? 1000 : 100 }}
      cancel="button"  // Prevent dragging when clicking on buttons
    >
      <div
        className={`
          w-full h-full border-2 rounded-lg flex items-center justify-center
          cursor-move transition-all duration-200 backdrop-blur-sm
          ${colorClass}
          ${isActive ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' : 'shadow-sm hover:shadow-md'}
          ${isDragging ? 'opacity-75 scale-105' : 'opacity-90 hover:opacity-100'}
        `}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <input
            type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditComplete}
            onKeyDown={handleKeyDown}
            className="w-full h-full px-2 text-xs bg-transparent border-none outline-none text-center"
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <Icon className="w-4 h-4 mr-1.5" />
            <span className="text-xs font-medium">
              {field.defaultValue || field.type}
            </span>
          </div>
        )}
        
        {isActive && (
          <div 
            className="absolute -top-8 left-0 right-0 z-50 flex justify-end"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('Delete button clicked for field:', field.id);
                onDelete(field.id);
              }}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 shadow-md cursor-pointer transition-all text-xs font-medium flex items-center gap-1"
              style={{ touchAction: 'none', pointerEvents: 'all' }}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}
      </div>
    </Rnd>
  );
};