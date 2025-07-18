'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { FileInfo, RecipientInfo } from '@/lib/types/signature';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

// Widget types
type WidgetType = 'signature' | 'date' | 'text' | 'name' | 'email' | 'initials';

// Widget data structure
interface Widget {
  id: string;
  type: WidgetType;
  page: number;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  value: string;
  placeholder: string;
  recipientId: string;
}

interface PDFSignatureViewerProps {
  files: FileInfo[];
  currentFileId: string;
  recipients: RecipientInfo[];
  selectedRecipientId: string;
  onSave: (widgets: Widget[]) => void;
  taskId?: string;
}

const PDFSignatureViewer: React.FC<PDFSignatureViewerProps> = ({
  files,
  currentFileId,
  recipients,
  selectedRecipientId,
  onSave,
  taskId
}) => {
  // State
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1);
  const [draggedType, setDraggedType] = useState<WidgetType | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const containerDimensions = useRef({ width: 0, height: 0 });

  // Get current file
  const currentFile = files.find(f => f.id === currentFileId) || files[0];

  // Update container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (pdfContainerRef.current) {
        containerDimensions.current = {
          width: pdfContainerRef.current.clientWidth,
          height: pdfContainerRef.current.clientHeight
        };
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Widget Templates
  const widgetTemplates: Record<WidgetType, { label: string; icon: string; defaultSize: { width: number; height: number } }> = {
    signature: { label: 'Signature', icon: '✍️', defaultSize: { width: 15, height: 8 } },
    date: { label: 'Date', icon: '📅', defaultSize: { width: 12, height: 6 } },
    text: { label: 'Text', icon: '📝', defaultSize: { width: 20, height: 6 } },
    name: { label: 'Name', icon: '👤', defaultSize: { width: 20, height: 6 } },
    email: { label: 'Email', icon: '✉️', defaultSize: { width: 25, height: 6 } },
    initials: { label: 'Initials', icon: '🆔', defaultSize: { width: 10, height: 6 } }
  };

  // Handle drag start
  const handleDragStart = (type: WidgetType) => {
    setDraggedType(type);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedType || !pdfContainerRef.current) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const template = widgetTemplates[draggedType];
    const newWidget: Widget = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: draggedType,
      page: currentPage,
      x: Math.max(0, Math.min(100 - template.defaultSize.width, x)),
      y: Math.max(0, Math.min(100 - template.defaultSize.height, y)),
      width: template.defaultSize.width,
      height: template.defaultSize.height,
      value: '',
      placeholder: `Enter ${template.label}`,
      recipientId: selectedRecipientId
    };

    setWidgets([...widgets, newWidget]);
    setSelectedWidget(newWidget.id);
    setDraggedType(null);
  };

  // Handle widget update
  const updateWidget = (id: string, updates: Partial<Widget>) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  // Handle widget delete
  const deleteWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    setSelectedWidget(null);
  };

  // Handle double click to edit
  const handleDoubleClick = (widget: Widget) => {
    if (widget.type === 'text' || widget.type === 'name' || widget.type === 'email') {
      setIsEditing(widget.id);
      setEditValue(widget.placeholder);
    }
  };

  // Complete editing
  const completeEditing = () => {
    if (isEditing && editValue) {
      updateWidget(isEditing, { placeholder: editValue });
    }
    setIsEditing(null);
    setEditValue('');
  };

  // Page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Zoom controls
  const zoom = (delta: number) => {
    setScale(Math.max(0.5, Math.min(2, scale + delta)));
  };

  // Get widgets for current page
  const currentPageWidgets = widgets.filter(w => w.page === currentPage);

  // Render widget
  const renderWidget = (widget: Widget) => {
    const isSelected = selectedWidget === widget.id;
    const isEditingThis = isEditing === widget.id;
    const recipient = recipients.find(r => r.id === widget.recipientId);
    
    // Convert percentage to pixels
    const container = pdfContainerRef.current;
    if (!container) return null;
    
    const pixelX = (widget.x / 100) * container.clientWidth;
    const pixelY = (widget.y / 100) * container.clientHeight;
    const pixelWidth = (widget.width / 100) * container.clientWidth;
    const pixelHeight = (widget.height / 100) * container.clientHeight;

    return (
      <Rnd
        key={widget.id}
        size={{ width: pixelWidth, height: pixelHeight }}
        position={{ x: pixelX, y: pixelY }}
        scale={scale}
        onDragStop={(e, d) => {
          const newX = (d.x / container.clientWidth) * 100;
          const newY = (d.y / container.clientHeight) * 100;
          updateWidget(widget.id, {
            x: Math.max(0, Math.min(100 - widget.width, newX)),
            y: Math.max(0, Math.min(100 - widget.height, newY))
          });
        }}
        onResizeStop={(e, direction, ref, delta, position) => {
          const newWidth = (ref.offsetWidth / container.clientWidth) * 100;
          const newHeight = (ref.offsetHeight / container.clientHeight) * 100;
          const newX = (position.x / container.clientWidth) * 100;
          const newY = (position.y / container.clientHeight) * 100;
          updateWidget(widget.id, {
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight
          });
        }}
        bounds="parent"
        onClick={() => setSelectedWidget(widget.id)}
        onDoubleClick={() => handleDoubleClick(widget)}
        className={`widget-rnd ${isSelected ? 'selected' : ''}`}
        style={{
          border: `2px solid ${isSelected ? '#2563eb' : '#93c5fd'}`,
          backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'rgba(147, 197, 253, 0.1)',
          borderRadius: '4px',
          cursor: 'move',
          zIndex: isSelected ? 10 : 1
        }}
        enableResizing={isSelected}
      >
        <div className="h-full flex items-center justify-center p-1">
          {isEditingThis ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={completeEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') completeEditing();
                if (e.key === 'Escape') {
                  setIsEditing(null);
                  setEditValue('');
                }
              }}
              className="w-full h-full text-xs border-none outline-none bg-transparent text-center"
              autoFocus
            />
          ) : (
            <div className="text-xs text-center">
              <div className="font-medium">{widget.value || widget.placeholder}</div>
            </div>
          )}
        </div>

        {/* Widget controls */}
        {isSelected && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteWidget(widget.id);
              }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
            >
              ×
            </button>
            <div className="absolute -top-6 left-0 text-xs bg-gray-800 text-white px-2 py-1 rounded">
              {widget.type} - {recipient?.name}
            </div>
          </>
        )}
      </Rnd>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Sidebar - Widget Palette */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h3 className="text-sm font-semibold mb-4">Signature Fields</h3>
        <div className="space-y-2">
          {Object.entries(widgetTemplates).map(([type, template]) => (
            <div
              key={type}
              draggable
              onDragStart={() => handleDragStart(type as WidgetType)}
              className="p-3 bg-gray-50 rounded-lg cursor-move hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{template.icon}</span>
                <span className="text-sm font-medium">{template.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700">
            <strong>Selected Recipient:</strong><br />
            {recipients.find(r => r.id === selectedRecipientId)?.name || 'None'}
          </p>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>• Drag fields to PDF</p>
          <p>• Click to select</p>
          <p>• Double-click text fields to edit</p>
          <p>• Drag to reposition</p>
          <p>• Resize from corners</p>
        </div>
      </div>

      {/* Main PDF Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Page Navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages || '?'}
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center space-x-2 border-l pl-4">
                <button
                  onClick={() => zoom(-0.1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ZoomOut size={20} />
                </button>
                <span className="text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
                <button
                  onClick={() => zoom(0.1)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ZoomIn size={20} />
                </button>
              </div>
            </div>

            <button
              onClick={() => onSave(widgets)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Save Positions
            </button>
          </div>
        </div>

        {/* PDF Container */}
        <div className="flex-1 overflow-auto p-8">
          <div
            ref={pdfContainerRef}
            className="mx-auto bg-white shadow-lg relative"
            style={{
              width: '850px',
              height: '1100px',
              transform: `scale(${scale})`,
              transformOrigin: 'top center'
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {/* PDF Iframe */}
            <iframe
              src={`${currentFile.supabaseUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full"
              style={{ border: 'none' }}
              onLoad={(e) => {
                // Try to detect total pages (this is a limitation with iframes)
                // In production, you might want to use a PDF library to get accurate page count
                setTotalPages(10); // Default estimate
              }}
            />

            {/* Widget Layer */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="relative w-full h-full pointer-events-auto">
                {currentPageWidgets.map(widget => renderWidget(widget))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Widget Properties */}
      {selectedWidget && (
        <div className="w-64 bg-white border-l border-gray-200 p-4">
          <h3 className="text-sm font-semibold mb-4">Widget Properties</h3>
          {(() => {
            const widget = widgets.find(w => w.id === selectedWidget);
            if (!widget) return null;

            return (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <div className="text-sm">{widgetTemplates[widget.type].label}</div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={widget.placeholder}
                    onChange={(e) => updateWidget(widget.id, { placeholder: e.target.value })}
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
                  <input
                    type="text"
                    value={widget.value}
                    onChange={(e) => updateWidget(widget.id, { value: e.target.value })}
                    className="w-full px-2 py-1 text-sm border rounded"
                    placeholder="Current value"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">X Position</label>
                    <input
                      type="number"
                      value={Math.round(widget.x)}
                      onChange={(e) => updateWidget(widget.id, { x: Number(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Y Position</label>
                    <input
                      type="number"
                      value={Math.round(widget.y)}
                      onChange={(e) => updateWidget(widget.id, { y: Number(e.target.value) })}
                      className="w-full px-2 py-1 text-sm border rounded"
                    />
                  </div>
                </div>

                <button
                  onClick={() => deleteWidget(widget.id)}
                  className="w-full px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                >
                  Delete Widget
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default PDFSignatureViewer;