'use client';

import React, { useState } from 'react';

// Define widget types based on OpenSign
export const WIDGET_TYPES = {
  SIGNATURE: 'signature',
  DATE: 'date',
  TEXT: 'text',
  INITIALS: 'initials',
  NAME: 'name',
  EMAIL: 'email',
  COMPANY: 'company',
  JOB_TITLE: 'job title',
  CHECKBOX: 'checkbox',
  STAMP: 'stamp'
} as const;

export type WidgetType = typeof WIDGET_TYPES[keyof typeof WIDGET_TYPES];

interface DragWidgetProps {
  type: WidgetType;
  icon: string;
  label: string;
  onDragStart?: (type: WidgetType) => void;
  onDragEnd?: () => void;
  disabled?: boolean;
}

interface DragWidgetListProps {
  onDragStart?: (type: WidgetType) => void;
  onDragEnd?: () => void;
  onWidgetClick?: (type: WidgetType) => void;
  disabledWidgets?: WidgetType[];
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface DragWidgetsProps {
  recipients: Recipient[];
  onControlDrag: (type: string, startPosition: { x: number; y: number }) => void;
}

// Single draggable widget component using native HTML5 drag
const DragWidget: React.FC<DragWidgetProps> = ({
  type,
  icon,
  label,
  onDragStart,
  onDragEnd,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }

    setIsDragging(true);
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.effectAllowed = 'copy';
    
    if (onDragStart) {
      onDragStart(type);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (onDragEnd) {
      onDragEnd();
    }
  };

  return (
    <div
      draggable={!disabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`
        flex flex-col items-center p-3 m-1 border-2 border-dashed rounded-lg transition-all
        ${disabled 
          ? 'opacity-50 cursor-not-allowed border-gray-300 bg-gray-100' 
          : isDragging 
            ? 'border-blue-500 bg-blue-50 shadow-lg cursor-grabbing'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-grab'
        }
        ${!disabled && 'hover:shadow-md'}
      `}
      style={{
        opacity: isDragging ? 0.7 : 1,
        minWidth: '80px',
        minHeight: '60px'
      }}
    >
      <i className={`${icon} text-xl mb-1 ${disabled ? 'text-gray-400' : 'text-blue-600'}`} />
      <span className={`text-xs text-center font-medium ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
        {label}
      </span>
    </div>
  );
};

// Enhanced widget list with all signature types
const EnhancedDragWidgets: React.FC<DragWidgetListProps> = ({
  onDragStart,
  onDragEnd,
  onWidgetClick,
  disabledWidgets = []
}) => {
  const widgets = [
    {
      type: WIDGET_TYPES.SIGNATURE,
      icon: 'fa-solid fa-signature',
      label: 'Signature'
    },
    {
      type: WIDGET_TYPES.INITIALS,
      icon: 'fa-solid fa-i',
      label: 'Initials'
    },
    {
      type: WIDGET_TYPES.DATE,
      icon: 'fa-solid fa-calendar',
      label: 'Date'
    },
    {
      type: WIDGET_TYPES.TEXT,
      icon: 'fa-solid fa-font',
      label: 'Text'
    },
    {
      type: WIDGET_TYPES.NAME,
      icon: 'fa-solid fa-user',
      label: 'Name'
    },
    {
      type: WIDGET_TYPES.EMAIL,
      icon: 'fa-solid fa-envelope',
      label: 'Email'
    },
    {
      type: WIDGET_TYPES.COMPANY,
      icon: 'fa-solid fa-building',
      label: 'Company'
    },
    {
      type: WIDGET_TYPES.JOB_TITLE,
      icon: 'fa-solid fa-briefcase',
      label: 'Job Title'
    },
    {
      type: WIDGET_TYPES.CHECKBOX,
      icon: 'fa-solid fa-square-check',
      label: 'Checkbox'
    },
    {
      type: WIDGET_TYPES.STAMP,
      icon: 'fa-solid fa-stamp',
      label: 'Stamp'
    }
  ] as const;

  const handleWidgetClick = (type: WidgetType) => {
    if (onWidgetClick && !disabledWidgets.includes(type)) {
      onWidgetClick(type);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="px-4 py-2 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Signature Controls</h3>
        <p className="text-xs text-gray-500">Drag widgets to PDF or click to add at center</p>
      </div>

      {/* Widget grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2">
          {widgets.map((widget) => {
            const isDisabled = disabledWidgets.includes(widget.type);
            
            return (
              <div
                key={widget.type}
                onClick={() => handleWidgetClick(widget.type)}
              >
                <DragWidget
                  type={widget.type}
                  icon={widget.icon}
                  label={widget.label}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  disabled={isDisabled}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Usage instructions */}
      <div className="px-4 py-3 bg-blue-50 border-t text-xs text-blue-700">
        <div className="flex items-start gap-2">
          <i className="fa-solid fa-info-circle mt-0.5" />
          <div>
            <p className="font-medium">How to use:</p>
            <ul className="mt-1 space-y-1 list-disc list-inside text-blue-600">
              <li>Drag widgets to precise positions on the PDF</li>
              <li>Click to add widget at the center of the page</li>
              <li>Click on placed widgets to edit properties</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDragWidgets; 