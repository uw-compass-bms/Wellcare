'use client';

import React, { useState, useRef, useEffect } from 'react';
import { convertDragEventToPosition } from '@/lib/utils/coordinates';
import PDFPagination from './pdf-pagination';

interface FileInfo {
  id: string;
  originalFilename: string;
  displayName: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
  supabaseUrl: string;
}

interface SignaturePosition {
  id?: string;
  recipientId: string;
  fileId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  placeholderText?: string;
}

interface PDFViewerCanvasProps {
  files: FileInfo[];
  currentFileId: string;
  currentPageNumber: number;
  positions: SignaturePosition[];
  selectedPosition: SignaturePosition | null;
  onPositionSelect: (position: SignaturePosition | null) => void;
  onPositionUpdate: (position: SignaturePosition) => void;
  onPositionDelete: (positionId: string) => void;
  onPositionAdd?: (position: Omit<SignaturePosition, 'id'>) => void;
  onPageChange: (pageNumber: number) => void;
  draggedItem?: string | null;
}

export default function PDFViewerCanvas({
  files,
  currentFileId,
  currentPageNumber,
  positions,
  selectedPosition,
  onPositionSelect,
  onPositionUpdate,
  onPositionDelete,
  onPositionAdd,
  onPageChange,
  draggedItem
}: PDFViewerCanvasProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<HTMLEmbedElement>(null);

  const currentFile = files.find(f => f.id === currentFileId);
  const currentPagePositions = positions.filter(
    p => p.fileId === currentFileId && p.pageNumber === currentPageNumber
  );

  // Handle drag over
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  // Handle drag leave
  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
  };

  // Handle drop
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();

    if (!pdfContainerRef.current || !onPositionAdd) {
      return;
    }

    const itemType = event.dataTransfer.getData('text/plain');
    if (!itemType) {
      return;
    }

    try {
      // Use coordinate conversion utility for precise positioning
      const positionData = convertDragEventToPosition(
        event,
        pdfContainerRef.current,
        itemType,
        currentFileId,
        currentPageNumber
      );

      console.log('Drop position data:', {
        itemType,
        pixelPosition: positionData.pixelPosition,
        percentagePosition: positionData.percentagePosition,
        containerDimensions: positionData.containerDimensions
      });

      // Create new signature position
      const newPosition: Omit<SignaturePosition, 'id'> = {
        recipientId: 'temp-recipient', // Will be set by parent component
        fileId: currentFileId,
        pageNumber: currentPageNumber,
        x: positionData.pixelPosition.x,
        y: positionData.pixelPosition.y,
        width: positionData.pixelPosition.width,
        height: positionData.pixelPosition.height,
        placeholderText: getPlaceholderText(itemType)
      };

      console.log('New signature position:', newPosition);
      onPositionAdd(newPosition);

    } catch (error) {
      console.error('Drop position calculation error:', error);
      // Fallback to simple calculation
      const rect = pdfContainerRef.current.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const relativeY = event.clientY - rect.top;
      
      const newPosition: Omit<SignaturePosition, 'id'> = {
        recipientId: 'temp-recipient',
        fileId: currentFileId,
        pageNumber: currentPageNumber,
        x: Math.max(0, relativeX - 60),
        y: Math.max(0, relativeY - 20),
        width: 120,
        height: 40,
        placeholderText: getPlaceholderText(itemType)
      };

      onPositionAdd(newPosition);
    }
  };

  // Get placeholder text based on drag type
  const getPlaceholderText = (itemType: string): string => {
    switch (itemType) {
      case 'signature':
        return 'Click to sign';
      case 'date':
        return 'Date';
      case 'text':
        return 'Text field';
      default:
        return 'Click here';
    }
  };

  // Handle drag start/end callbacks (now handled by parent)
  // Drag state is passed as prop from parent component

  // Detect PDF total pages (simplified approach)
  useEffect(() => {
    // For demo purposes, assume 5 pages max
    // In real implementation, you would extract this from PDF metadata
    setTotalPages(5);
  }, [currentFile]);

  if (!currentFile) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2">No File Selected</h3>
          <p className="text-sm">Please select a file to view</p>
        </div>
      </div>
    );
  }

  if (!currentFile.supabaseUrl) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="text-center text-red-500">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium mb-2">Invalid File URL</h3>
          <p className="text-sm">The PDF file URL is missing or invalid</p>
          <p className="text-xs mt-2 text-gray-500">URL: {currentFile.supabaseUrl}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-100 flex flex-col">
      {/* File info header */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h3 className="font-medium text-gray-900">{currentFile.displayName}</h3>
            <p className="text-sm text-gray-600">
              Page {currentPageNumber} of {totalPages}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {currentPagePositions.length} signature position(s) on this page
          </div>
        </div>
      </div>

      {/* PDF display area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto py-8">
          <div 
            className={`bg-white rounded-lg shadow-sm overflow-hidden transition-all ${
              draggedItem ? 'ring-2 ring-blue-300 ring-opacity-50' : ''
            }`}
          >
            <div 
              ref={pdfContainerRef}
              data-pdf-container
              className="relative min-h-[800px]"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* PDF content using embed instead of iframe */}
              <embed
                ref={embedRef}
                src={`${currentFile.supabaseUrl}#page=${currentPageNumber}&toolbar=0&navpanes=0&scrollbar=0`}
                type="application/pdf"
                className="w-full h-full min-h-[800px] pointer-events-none"
                title={currentFile.displayName}
                onLoad={() => {
                  setLoading(false);
                  setError(null);
                }}
                onError={() => {
                  setLoading(false);
                  setError('Failed to load PDF');
                }}
              />

              {/* Transparent overlay to capture drag events */}
              <div 
                className="absolute inset-0 pointer-events-auto"
                style={{ background: 'transparent' }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />

              {/* Drag feedback overlay */}
              {draggedItem && (
                <div className="absolute inset-0 bg-blue-50 bg-opacity-80 flex items-center justify-center pointer-events-none z-10">
                  <div className="text-center text-blue-600">
                    <div className="text-4xl mb-2">📝</div>
                    <div className="text-lg font-medium">Drop here to add signature position</div>
                    <div className="text-sm">Release to place a {draggedItem} field</div>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {loading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-20">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading PDF...</p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20">
                  <div className="text-center text-red-500">
                    <div className="text-6xl mb-4">❌</div>
                    <h3 className="text-lg font-medium mb-2">Error Loading PDF</h3>
                    <p className="text-sm">{error}</p>
                    <p className="text-xs mt-2 text-gray-500">URL: {currentFile.supabaseUrl}</p>
                  </div>
                </div>
              )}

              {/* Render signature positions */}
              <div className="absolute inset-0 pointer-events-none z-30">
                {currentPagePositions.map((position) => (
                  <div
                    key={position.id || `${position.x}-${position.y}`}
                    className={`absolute border-2 bg-blue-50 bg-opacity-70 cursor-pointer transition-all pointer-events-auto ${
                      selectedPosition?.id === position.id
                        ? 'border-blue-500 shadow-lg'
                        : 'border-blue-300 hover:border-blue-400'
                    }`}
                    style={{
                      left: `${position.x}px`,
                      top: `${position.y}px`,
                      width: `${position.width}px`,
                      height: `${position.height}px`,
                    }}
                    onClick={() => onPositionSelect(position)}
                  >
                    <div className="flex items-center justify-center h-full text-xs text-blue-600 font-medium">
                      {position.placeholderText || 'Signature'}
                    </div>
                    
                    {/* Delete button */}
                    {selectedPosition?.id === position.id && (
                      <button
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (position.id) {
                            onPositionDelete(position.id);
                          }
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pagination */}
          <PDFPagination
            currentPage={currentPageNumber}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      </div>
    </div>
  );
} 