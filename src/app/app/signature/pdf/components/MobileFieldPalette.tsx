'use client';

import React from 'react';
import { X, Calendar, Type, Hash, CheckSquare, Mail, User, FileSignature } from 'lucide-react';
import { FieldType } from './FieldPalette';

interface MobileFieldPaletteProps {
  selectedType: FieldType | null;
  onSelectType: (type: FieldType | null) => void;
  isOpen: boolean;
  onClose: () => void;
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
 * Mobile-optimized field palette as drawer
 * 移动端优化的字段选择器（抽屉式）
 */
export const MobileFieldPalette: React.FC<MobileFieldPaletteProps> = ({
  selectedType,
  onSelectType,
  isOpen,
  onClose,
}) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-lg z-50
          transform transition-transform duration-300 md:hidden
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2">
          <h3 className="text-lg font-semibold">Add Field</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Field types grid */}
        <div className="grid grid-cols-3 gap-3 p-4 pb-8">
          {fieldTypes.map(({ type, icon: Icon, label, color }) => (
            <button
              key={type}
              onClick={() => {
                onSelectType(type === selectedType ? null : type);
                if (type !== selectedType) {
                  setTimeout(onClose, 300);
                }
              }}
              className={`
                flex flex-col items-center justify-center p-4 rounded-lg border-2
                transition-all duration-200
                ${
                  selectedType === type
                    ? `border-blue-500 ${color} text-white`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              <Icon className="w-6 h-6 mb-2" />
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </div>
        
        {selectedType && (
          <div className="px-4 pb-6">
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              Tap on PDF to add {fieldTypes.find(f => f.type === selectedType)?.label} field
            </div>
          </div>
        )}
      </div>
    </>
  );
};