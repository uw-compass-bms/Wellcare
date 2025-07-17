'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Send } from 'lucide-react';

// Types
interface RecipientInfo {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface FileInfo {
  id: string;
  originalFilename: string;
  displayName: string;
  supabaseUrl: string;
}

interface SignaturePosition {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
  recipientId: string;
  placeholderText?: string;
}

interface WorkingPDFSignatureProps {
  taskId: string;
  taskTitle: string;
  files: FileInfo[];
  recipients: RecipientInfo[];
  onGoBack: () => void;
  onSave: () => void;
  onSendEmails: () => void;
  isSaving?: boolean;
  isSending?: boolean;
}

// Drag Widget Component
const DragWidget: React.FC<{
  type: string;
  label: string;
  icon: string;
  color: string;
}> = ({ type, label, icon, color }) => {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('widget-type', type);
        e.dataTransfer.effectAllowed = 'copy';
        console.log('Drag started:', type);
      }}
      className="p-3 rounded-lg cursor-move transition-all duration-200 hover:scale-105 select-none"
      style={{ backgroundColor: color }}
    >
      <div className="flex items-center space-x-2 text-white">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-xs text-white/80 mt-1">
        Drag to PDF
      </div>
    </div>
  );
};

// PDF Viewer Component
const PDFDropZone: React.FC<{
  file: FileInfo;
  pageNumber: number;
  selectedRecipientId: string;
  positions: SignaturePosition[];
  onPositionAdd: (position: Omit<SignaturePosition, 'id'>) => void;
  onPositionSelect: (position: SignaturePosition | null) => void;
  onPositionDelete: (positionId: string) => void;
  selectedPosition: SignaturePosition | null;
}> = ({ 
  file, 
  pageNumber, 
  selectedRecipientId, 
  positions, 
  onPositionAdd, 
  onPositionSelect,
  onPositionDelete,
  selectedPosition 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!pdfContainerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const widgetType = e.dataTransfer.getData('widget-type');
    if (!widgetType || !selectedRecipientId) {
      alert('Please select a recipient first');
      return;
    }

    const rect = pdfContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    console.log('Drop coordinates:', { x, y, widgetType, selectedRecipientId });

    const newPosition: Omit<SignaturePosition, 'id'> = {
      type: widgetType,
      x: x,
      y: y,
      width: 120,
      height: 40,
      pageNumber: pageNumber,
      recipientId: selectedRecipientId,
      placeholderText: getPlaceholderText(widgetType)
    };

    onPositionAdd(newPosition);
  };

  const getPlaceholderText = (type: string) => {
    const placeholders: Record<string, string> = {
      signature: 'Click to sign',
      date: 'Date',
      text: 'Text field',
      checkbox: 'Checkbox',
      initials: 'Initials'
    };
    return placeholders[type] || 'Click here';
  };

  const currentPagePositions = positions.filter(p => p.pageNumber === pageNumber);

  return (
    <div className="flex-1 bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-medium text-gray-900">{file.displayName}</h3>
            <p className="text-sm text-gray-600">Page {pageNumber} - {currentPagePositions.length} signature positions</p>
          </div>

          <div 
            ref={pdfContainerRef}
            className={`relative min-h-[600px] bg-white transition-all ${
              isDragOver ? 'bg-blue-50 border-4 border-dashed border-blue-400' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* PDF Display */}
            <embed
              src={`${file.supabaseUrl}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0`}
              type="application/pdf"
              className="w-full h-[600px] pointer-events-none"
              title={file.displayName}
            />

            {/* Drop Overlay */}
            {isDragOver && (
              <div className="absolute inset-0 bg-blue-100 bg-opacity-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">📍</div>
                  <div className="text-xl font-semibold text-blue-600">Drop signature control here</div>
                  <div className="text-sm text-blue-500">Release mouse to place</div>
                </div>
              </div>
            )}

            {/* Signature Positions Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {currentPagePositions.map((position) => {
                const isSelected = selectedPosition?.id === position.id;
                return (
                  <div
                    key={position.id}
                    className={`absolute border-2 bg-opacity-70 cursor-pointer transition-all pointer-events-auto ${
                      isSelected
                        ? 'border-blue-500 bg-blue-100 shadow-lg ring-2 ring-blue-300'
                        : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:shadow-md'
                    }`}
                    style={{
                      left: `${position.x}px`,
                      top: `${position.y}px`,
                      width: `${position.width}px`,
                      height: `${position.height}px`,
                      zIndex: 10
                    }}
                    onClick={() => onPositionSelect(position)}
                  >
                    <div className="flex items-center justify-center h-full text-xs text-blue-600 font-medium px-1">
                      {position.placeholderText}
                    </div>
                    
                    {/* Delete button for selected */}
                    {isSelected && (
                      <button
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPositionDelete(position.id);
                          onPositionSelect(null);
                        }}
                      >
                        ×
                      </button>
                    )}

                    {/* Type indicator */}
                    <div className="absolute -top-1 -left-1 text-xs bg-blue-500 text-white px-1 rounded text-[10px]">
                      {position.type.charAt(0).toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
const WorkingPDFSignature: React.FC<WorkingPDFSignatureProps> = ({
  taskId,
  taskTitle,
  files,
  recipients,
  onGoBack,
  onSave,
  onSendEmails,
  isSaving = false,
  isSending = false
}) => {
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [currentFileId, setCurrentFileId] = useState<string>('');
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(1);
  const [signaturePositions, setSignaturePositions] = useState<SignaturePosition[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<SignaturePosition | null>(null);

  // Initialize defaults
  useEffect(() => {
    if (recipients.length > 0 && !selectedRecipientId) {
      setSelectedRecipientId(recipients[0].id);
    }
  }, [recipients, selectedRecipientId]);

  useEffect(() => {
    if (files.length > 0 && !currentFileId) {
      setCurrentFileId(files[0].id);
    }
  }, [files, currentFileId]);

  const currentFile = files.find(f => f.id === currentFileId);

  const handlePositionAdd = async (newPosition: Omit<SignaturePosition, 'id'>) => {
    // Create temporary position with unique ID
    const tempPosition: SignaturePosition = {
      ...newPosition,
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Add to local state immediately
    setSignaturePositions(prev => [...prev, tempPosition]);
    setSelectedPosition(tempPosition);

    try {
      // Save to API
      const response = await fetch('/api/signature/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: newPosition.recipientId,
          fileId: currentFileId,
          pageNumber: newPosition.pageNumber,
          x: newPosition.x,
          y: newPosition.y,
          width: newPosition.width,
          height: newPosition.height,
          placeholderText: newPosition.placeholderText,
          pageWidth: 800,
          pageHeight: 600
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Position saved successfully:', result);
        
        // Update with real ID
        setSignaturePositions(prev => 
          prev.map(p => p.id === tempPosition.id ? { ...tempPosition, id: result.data.id } : p)
        );
      } else {
        // Remove temp position on failure
        setSignaturePositions(prev => prev.filter(p => p.id !== tempPosition.id));
        setSelectedPosition(null);
        alert('Failed to save signature position');
      }
    } catch (error) {
      console.error('Error saving position:', error);
      // Remove temp position on error
      setSignaturePositions(prev => prev.filter(p => p.id !== tempPosition.id));
      setSelectedPosition(null);
      alert('Error saving signature position');
    }
  };

  const handlePositionDelete = async (positionId: string) => {
    if (positionId.startsWith('temp-')) {
      // Just remove from local state
      setSignaturePositions(prev => prev.filter(p => p.id !== positionId));
      return;
    }

    try {
      const response = await fetch(`/api/signature/positions/${positionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSignaturePositions(prev => prev.filter(p => p.id !== positionId));
        console.log('Position deleted successfully');
      } else {
        alert('Failed to delete signature position');
      }
    } catch (error) {
      console.error('Error deleting position:', error);
      alert('Error deleting signature position');
    }
  };

  const widgets = [
    { type: 'signature', label: 'Signature', icon: '✍️', color: '#3B82F6' },
    { type: 'date', label: 'Date', icon: '📅', color: '#10B981' },
    { type: 'text', label: 'Text', icon: '📝', color: '#F59E0B' },
    { type: 'checkbox', label: 'Checkbox', icon: '☑️', color: '#8B5CF6' },
    { type: 'initials', label: 'Initials', icon: '🆔', color: '#EF4444' }
  ];

  if (!currentFile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2">No Files Available</h3>
          <p className="text-sm text-gray-600 mb-4">Please upload PDF files to continue</p>
          <Button onClick={onGoBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button onClick={onGoBack} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-lg font-semibold">{taskTitle}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={onSave} disabled={isSaving} size="sm">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button onClick={onSendEmails} disabled={isSending} size="sm">
              <Send className="w-4 h-4 mr-2" />
              {isSending ? 'Sending...' : 'Send Emails'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Sidebar */}
        <div className="w-64 bg-white border-r p-4 overflow-y-auto">
          {/* Drag Controls */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Signature Controls</h3>
            <div className="space-y-2">
              {widgets.map((widget) => (
                <DragWidget
                  key={widget.type}
                  type={widget.type}
                  label={widget.label}
                  icon={widget.icon}
                  color={widget.color}
                />
              ))}
            </div>
          </div>

          {/* Recipients */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recipients</h3>
            <div className="space-y-2">
              {recipients.map((recipient) => (
                <div 
                  key={recipient.id} 
                  className={`p-3 border rounded transition-colors cursor-pointer ${
                    selectedRecipientId === recipient.id
                      ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-200'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedRecipientId(recipient.id)}
                >
                  <div className="text-sm font-medium text-gray-900">{recipient.name}</div>
                  <div className="text-xs text-gray-500">{recipient.email}</div>
                  {selectedRecipientId === recipient.id && (
                    <div className="mt-2 text-xs text-teal-700 bg-teal-50 px-2 py-1 rounded">
                      Selected for new signatures
                    </div>
                  )}
                </div>
              ))}
              {recipients.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-4">No recipients added</div>
              )}
            </div>
          </div>

          {/* Files */}
          {files.length > 1 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Files</h3>
              <div className="space-y-2">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => setCurrentFileId(file.id)}
                    className={`w-full text-left p-3 rounded text-xs transition-colors ${
                      currentFileId === file.id
                        ? 'bg-teal-50 border border-teal-200 text-teal-700'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium truncate">
                      {file.displayName || file.originalFilename}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main PDF Area */}
        <PDFDropZone
          file={currentFile}
          pageNumber={currentPageNumber}
          selectedRecipientId={selectedRecipientId}
          positions={signaturePositions.filter(p => p.pageNumber === currentPageNumber)}
          onPositionAdd={handlePositionAdd}
          onPositionSelect={setSelectedPosition}
          onPositionDelete={handlePositionDelete}
          selectedPosition={selectedPosition}
        />

        {/* Right Sidebar - Properties */}
        <div className="w-80 bg-white border-l p-4">
          {selectedPosition ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Position Properties</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Placeholder Text
                  </label>
                  <input
                    type="text"
                    value={selectedPosition.placeholderText || ''}
                    onChange={(e) => {
                      const updated = { ...selectedPosition, placeholderText: e.target.value };
                      setSelectedPosition(updated);
                      setSignaturePositions(prev => 
                        prev.map(p => p.id === selectedPosition.id ? updated : p)
                      );
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    placeholder="Enter placeholder text"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Width</label>
                    <input
                      type="number"
                      value={selectedPosition.width}
                      onChange={(e) => {
                        const updated = { ...selectedPosition, width: parseInt(e.target.value) || 120 };
                        setSelectedPosition(updated);
                        setSignaturePositions(prev => 
                          prev.map(p => p.id === selectedPosition.id ? updated : p)
                        );
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Height</label>
                    <input
                      type="number"
                      value={selectedPosition.height}
                      onChange={(e) => {
                        const updated = { ...selectedPosition, height: parseInt(e.target.value) || 40 };
                        setSelectedPosition(updated);
                        setSignaturePositions(prev => 
                          prev.map(p => p.id === selectedPosition.id ? updated : p)
                        );
                      }}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Position: ({selectedPosition.x}, {selectedPosition.y})<br/>
                  Size: {selectedPosition.width} × {selectedPosition.height}<br/>
                  Page: {selectedPosition.pageNumber}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-sm">Select a signature position</div>
              <div className="text-xs mt-1">Click on a signature box to edit properties</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkingPDFSignature;