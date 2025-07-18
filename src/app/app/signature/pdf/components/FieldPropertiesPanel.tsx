'use client';

import React, { useEffect, useState } from 'react';
import { X, Settings } from 'lucide-react';
import { Field, FieldType, FieldMeta } from './FieldItem';

interface FieldPropertiesPanelProps {
  field: Field | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Field>) => void;
}

export const FieldPropertiesPanel: React.FC<FieldPropertiesPanelProps> = ({
  field,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [localField, setLocalField] = useState<Field | null>(null);

  useEffect(() => {
    setLocalField(field);
  }, [field]);

  if (!isOpen || !localField) return null;

  const handleFieldTypeChange = (type: FieldType) => {
    const newField = { ...localField, type };
    
    // 设置默认的 fieldMeta
    const defaultMeta: FieldMeta = {};
    switch (type) {
      case 'text':
      case 'name':
      case 'email':
        defaultMeta.maxLength = 100;
        defaultMeta.placeholder = `Enter ${type}`;
        break;
      case 'date':
        defaultMeta.format = 'MM/DD/YYYY';
        break;
      case 'number':
        defaultMeta.min = undefined;
        defaultMeta.max = undefined;
        break;
      case 'checkbox':
        defaultMeta.defaultChecked = false;
        break;
      case 'signature':
        defaultMeta.penColor = 'blue';
        defaultMeta.lineWidth = 2;
        break;
    }
    
    newField.fieldMeta = defaultMeta;
    setLocalField(newField);
    onUpdate(localField.id, { type, fieldMeta: defaultMeta });
  };

  const handleMetaUpdate = (key: string, value: any) => {
    const newMeta = { ...localField.fieldMeta, [key]: value };
    setLocalField({ ...localField, fieldMeta: newMeta });
    onUpdate(localField.id, { fieldMeta: newMeta });
  };

  const handleRequiredToggle = () => {
    const newRequired = !localField.required;
    setLocalField({ ...localField, required: newRequired });
    onUpdate(localField.id, { required: newRequired });
  };

  const handlePlaceholderChange = (placeholder: string) => {
    setLocalField({ ...localField, placeholder });
    onUpdate(localField.id, { placeholder });
  };

  const handleDefaultValueChange = (defaultValue: string) => {
    setLocalField({ ...localField, defaultValue });
    onUpdate(localField.id, { defaultValue });
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold">Field Properties</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6 overflow-y-auto h-[calc(100%-4rem)]">
        {/* Field Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Field Type
          </label>
          <select
            value={localField.type}
            onChange={(e) => handleFieldTypeChange(e.target.value as FieldType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="signature">Signature</option>
            <option value="text">Text</option>
            <option value="name">Name</option>
            <option value="email">Email</option>
            <option value="date">Date</option>
            <option value="number">Number</option>
            <option value="checkbox">Checkbox</option>
          </select>
        </div>

        {/* Required Field */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Required Field
          </label>
          <button
            onClick={handleRequiredToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              localField.required ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localField.required ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Placeholder Text (for text fields) */}
        {['text', 'name', 'email', 'number'].includes(localField.type) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Placeholder Text
            </label>
            <input
              type="text"
              value={localField.placeholder || ''}
              onChange={(e) => handlePlaceholderChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter placeholder text"
            />
          </div>
        )}

        {/* Default Value */}
        {['text', 'name', 'email', 'number', 'date'].includes(localField.type) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Value
            </label>
            <input
              type={localField.type === 'number' ? 'number' : 'text'}
              value={localField.defaultValue || ''}
              onChange={(e) => handleDefaultValueChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter default value"
            />
          </div>
        )}

        {/* Field-specific settings */}
        {localField.type === 'text' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Length
              </label>
              <input
                type="number"
                value={localField.fieldMeta?.maxLength || 100}
                onChange={(e) => handleMetaUpdate('maxLength', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Multi-line
              </label>
              <button
                onClick={() => handleMetaUpdate('multiline', !localField.fieldMeta?.multiline)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  localField.fieldMeta?.multiline ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    localField.fieldMeta?.multiline ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </>
        )}

        {localField.type === 'date' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <select
              value={localField.fieldMeta?.format || 'MM/DD/YYYY'}
              onChange={(e) => handleMetaUpdate('format', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD.MM.YYYY">DD.MM.YYYY</option>
            </select>
          </div>
        )}

        {localField.type === 'number' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Value
              </label>
              <input
                type="number"
                value={localField.fieldMeta?.min || ''}
                onChange={(e) => handleMetaUpdate('min', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="No minimum"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Value
              </label>
              <input
                type="number"
                value={localField.fieldMeta?.max || ''}
                onChange={(e) => handleMetaUpdate('max', e.target.value ? parseFloat(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="No maximum"
              />
            </div>
          </>
        )}

        {localField.type === 'signature' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pen Color
              </label>
              <select
                value={localField.fieldMeta?.penColor || 'blue'}
                onChange={(e) => handleMetaUpdate('penColor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="blue">Blue</option>
                <option value="black">Black</option>
                <option value="red">Red</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Line Width
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={localField.fieldMeta?.lineWidth || 2}
                onChange={(e) => handleMetaUpdate('lineWidth', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-sm text-gray-600">
                {localField.fieldMeta?.lineWidth || 2}px
              </div>
            </div>
          </>
        )}

        {localField.type === 'checkbox' && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Default Checked
            </label>
            <button
              onClick={() => handleMetaUpdate('defaultChecked', !localField.fieldMeta?.defaultChecked)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localField.fieldMeta?.defaultChecked ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localField.fieldMeta?.defaultChecked ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}

        {/* Field ID (read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Field ID
          </label>
          <input
            type="text"
            value={localField.id}
            readOnly
            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600"
          />
        </div>
      </div>
    </div>
  );
};