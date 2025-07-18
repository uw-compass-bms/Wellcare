'use client';

import React from 'react';
import { Calendar, Type, Hash, CheckSquare, Mail, User, FileSignature } from 'lucide-react';

import { FieldType } from './FieldItem';

// Re-export for convenience
export type { FieldType };

interface FieldPaletteProps {
  selectedType: FieldType | null;
  onSelectType: (type: FieldType | null) => void;
}

const fieldTypes = [
  { type: 'signature' as FieldType, icon: FileSignature, label: 'Signature', color: 'bg-blue-500' },
  { type: 'date' as FieldType, icon: Calendar, label: 'Date', color: 'bg-green-500' },
  { type: 'text' as FieldType, icon: Type, label: 'Text', color: 'bg-gray-500' },
  { type: 'name' as FieldType, icon: User, label: 'Name', color: 'bg-indigo-500' },
  { type: 'email' as FieldType, icon: Mail, label: 'Email', color: 'bg-yellow-500' },
  { type: 'number' as FieldType, icon: Hash, label: 'Number', color: 'bg-purple-500' },
  { type: 'checkbox' as FieldType, icon: CheckSquare, label: 'Checkbox', color: 'bg-pink-500' },
];

/**
 * 字段选择面板组件
 * 用户选择字段类型后，点击PDF即可放置字段
 */
export const FieldPalette: React.FC<FieldPaletteProps> = ({
  selectedType,
  onSelectType,
}) => {
  return (
    <div className="field-palette bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Fields</h3>
      <div className="grid grid-cols-2 gap-2">
        {fieldTypes.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => onSelectType(type === selectedType ? null : type)}
            className={`
              flex flex-col items-center justify-center p-3 rounded-lg border-2
              transition-all duration-200
              ${
                selectedType === type
                  ? `border-blue-500 ${color} text-white`
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
          >
            <Icon className="w-5 h-5 mb-1" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
      
      {selectedType && (
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
          Click on PDF to add {fieldTypes.find(f => f.type === selectedType)?.label} field
        </div>
      )}
    </div>
  );
};