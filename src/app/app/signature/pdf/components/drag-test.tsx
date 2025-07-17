'use client';

import React, { useState } from 'react';

const DragTest: React.FC = () => {
  const [droppedItems, setDroppedItems] = useState<Array<{
    id: string;
    type: string;
    x: number;
    y: number;
  }>>([]);

  const [dragOver, setDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('item-type', type);
    console.log('Drag started:', type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const itemType = e.dataTransfer.getData('item-type');
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    console.log('Drop event:', { itemType, x, y });

    if (itemType) {
      const newItem = {
        id: `item-${Date.now()}`,
        type: itemType,
        x,
        y
      };

      setDroppedItems(prev => [...prev, newItem]);
      console.log('Added item:', newItem);
    }
  };

  const clearItems = () => {
    setDroppedItems([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Drag & Drop Test</h1>
        
        <div className="grid grid-cols-4 gap-6">
          {/* Drag Sources */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Drag Items</h2>
            <div className="space-y-3">
              {['signature', 'date', 'text', 'checkbox'].map((type) => (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, type)}
                  className="p-3 bg-blue-500 text-white rounded cursor-move hover:bg-blue-600 transition-colors select-none"
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </div>
              ))}
            </div>
            
            <button
              onClick={clearItems}
              className="mt-4 w-full p-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear All
            </button>
          </div>

          {/* Drop Zone */}
          <div className="col-span-3">
            <div
              className={`relative bg-white border-4 border-dashed rounded-lg h-96 transition-colors ${
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
                {droppedItems.length === 0 ? (
                  <div className="text-center">
                    <div className="text-4xl mb-2">📍</div>
                    <div>Drag items here to test</div>
                  </div>
                ) : null}
              </div>

              {/* Dropped Items */}
              {droppedItems.map((item) => (
                <div
                  key={item.id}
                  className="absolute bg-yellow-200 border-2 border-yellow-400 rounded p-2 text-sm font-medium"
                  style={{
                    left: `${item.x}px`,
                    top: `${item.y}px`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={() => {
                    setDroppedItems(prev => prev.filter(i => i.id !== item.id));
                  }}
                >
                  {item.type}
                  <div className="text-xs text-gray-600">
                    ({Math.round(item.x)}, {Math.round(item.y)})
                  </div>
                </div>
              ))}

              {dragOver && (
                <div className="absolute inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center pointer-events-none">
                  <div className="text-lg font-semibold text-blue-600">
                    Release to drop here
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Debug Info</h3>
          <div className="text-sm">
            <div>Total dropped items: {droppedItems.length}</div>
            <div>Drag over state: {dragOver ? 'true' : 'false'}</div>
          </div>
          
          {droppedItems.length > 0 && (
            <div className="mt-3">
              <h4 className="font-medium mb-1">Dropped Items:</h4>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(droppedItems, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DragTest;