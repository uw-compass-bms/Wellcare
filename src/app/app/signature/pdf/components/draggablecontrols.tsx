 'use client';

import React from 'react';

interface Recipient {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DraggableControlsProps {
  recipients: Recipient[];
  onControlDrag: (type: string, startPosition: { x: number; y: number }) => void;
}

const DraggableControls: React.FC<DraggableControlsProps> = ({ 
  recipients, 
  onControlDrag 
}) => {
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4">
      {/* Signature Controls */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Signature Controls</h3>
        <div className="space-y-2">
          {/* Signature */}
          <div 
            className="p-3 bg-blue-50 border border-blue-200 rounded cursor-move hover:bg-blue-100"
            draggable
            onDragStart={(e) => {
              onControlDrag('signature', { x: e.clientX, y: e.clientY });
            }}
          >
            <div className="text-xs text-blue-700">✍️ Signature</div>
          </div>

          {/* Date */}
          <div 
            className="p-3 bg-green-50 border border-green-200 rounded cursor-move hover:bg-green-100"
            draggable
            onDragStart={(e) => {
              onControlDrag('date', { x: e.clientX, y: e.clientY });
            }}
          >
            <div className="text-xs text-green-700">📅 Date</div>
          </div>

          {/* Text */}
          <div 
            className="p-3 bg-yellow-50 border border-yellow-200 rounded cursor-move hover:bg-yellow-100"
            draggable
            onDragStart={(e) => {
              onControlDrag('text', { x: e.clientX, y: e.clientY });
            }}
          >
            <div className="text-xs text-yellow-700">📝 Text</div>
          </div>

          {/* Checkbox */}
          <div 
            className="p-3 bg-purple-50 border border-purple-200 rounded cursor-move hover:bg-purple-100"
            draggable
            onDragStart={(e) => {
              onControlDrag('checkbox', { x: e.clientX, y: e.clientY });
            }}
          >
            <div className="text-xs text-purple-700">☑️ Checkbox</div>
          </div>
        </div>
      </div>

      {/* Recipients */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Recipients</h3>
        <div className="space-y-2">
          {recipients.map((recipient) => (
            <div 
              key={recipient.id}
              className="p-3 bg-gray-50 border border-gray-200 rounded"
            >
              <div className="text-sm font-medium text-gray-900">
                {recipient.name}
              </div>
              <div className="text-xs text-gray-500">
                {recipient.email}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {recipient.role}
              </div>
            </div>
          ))}
          {recipients.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-4">
              No recipients
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DraggableControls;