 'use client';

import React from 'react';

interface SignaturePosition {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  recipientId?: string;
  placeholderText?: string;
}

interface SidebarPropertiesProps {
  selectedPosition: SignaturePosition | null;
  onUpdatePosition: (position: SignaturePosition) => void;
  onDeletePosition: (positionId: string) => void;
}

const SidebarProperties: React.FC<SidebarPropertiesProps> = ({
  selectedPosition,
  onUpdatePosition,
  onDeletePosition
}) => {
  if (!selectedPosition) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <div className="text-center text-gray-500 py-8">
          <div className="text-sm">Select a signature position</div>
          <div className="text-xs mt-1">Click on a signature box in the PDF to edit properties</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Properties</h3>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Type
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
            {selectedPosition.type === 'signature' && '✍️ Signature'}
            {selectedPosition.type === 'date' && '📅 Date'}
            {selectedPosition.type === 'text' && '📝 Text'}
            {selectedPosition.type === 'checkbox' && '☑️ Checkbox'}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Page
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
            Page {selectedPosition.pageNumber}
          </div>
        </div>

        {/* Position Coordinates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              X Position
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
              {Math.round(selectedPosition.x)}px
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Y Position
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
              {Math.round(selectedPosition.y)}px
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Width
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
              {Math.round(selectedPosition.width)}px
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Height
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
              {Math.round(selectedPosition.height)}px
            </div>
          </div>
        </div>

        {/* Assigned to Recipient */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Assigned to
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
            {selectedPosition.recipientId ? `Recipient ${selectedPosition.recipientId}` : 'Unassigned'}
          </div>
        </div>

        {/* Placeholder Text */}
        {selectedPosition.placeholderText && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Placeholder Text
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm">
              {selectedPosition.placeholderText}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={() => onDeletePosition(selectedPosition.id)}
            className="w-full px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 text-sm"
          >
            Delete Position
          </button>
        </div>
      </div>
    </div>
  );
};

export default SidebarProperties;