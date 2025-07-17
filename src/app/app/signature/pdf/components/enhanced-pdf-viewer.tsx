'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  convertDragToSignaturePosition,
  normalizedToPixelPosition,
  updatePositionAfterDrag,
  getContainerScale,
  PDFDimensions,
  ContainerDimensions,
  WidgetType
} from '@/lib/utils/coordinates-enhanced';
import { 
  FileInfo, 
  RecipientInfo, 
  SignaturePositionData 
} from '@/lib/types/signature';
import PDFPagination from './pdf-pagination';
import { PDFDocument } from 'pdf-lib';

export interface EnhancedPDFViewerProps {
  files: FileInfo[];
  recipients: RecipientInfo[];
  currentFileId: string;
  currentPageNumber: number;
  positions: SignaturePositionData[];
  selectedPosition: SignaturePositionData | null;
  selectedRecipientId: string;
  onPositionSelect: (position: SignaturePositionData | null) => void;
  onPositionUpdate: (position: SignaturePositionData) => void;
  onPositionDelete: (positionId: string) => void;
  onPositionAdd: (position: Omit<SignaturePositionData, 'key'>) => void;
  onPageChange: (pageNumber: number) => void;
  draggedWidgetType?: WidgetType | null;
  scale?: number;
  pdfDimensions?: PDFDimensions[];
}

const EnhancedPDFViewer: React.FC<EnhancedPDFViewerProps> = ({
  files,
  recipients,
  currentFileId,
  currentPageNumber,
  positions,
  selectedPosition,
  selectedRecipientId,
  onPositionSelect,
  onPositionUpdate,
  onPositionDelete,
  onPositionAdd,
  onPageChange,
  draggedWidgetType,
  scale = 1,
  pdfDimensions = []
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [containerDimensions, setContainerDimensions] = useState<ContainerDimensions>({ width: 0, height: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<HTMLEmbedElement>(null);

  const currentFile = files.find(f => f.id === currentFileId);
  const currentPagePositions = positions.filter(p => p.pageNumber === currentPageNumber);

  // Function to get PDF page count with better error handling
  const getPDFPageCount = async (pdfUrl: string): Promise<number> => {
    try {
      // Validate URL format
      if (!pdfUrl || !pdfUrl.startsWith('http')) {
        console.warn('Invalid PDF URL:', pdfUrl);
        return 1;
      }

      const response = await fetch(pdfUrl, {
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      if (!response.ok) {
        console.warn('Failed to fetch PDF:', response.status, response.statusText);
        return 1;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/pdf')) {
        console.warn('Response is not a PDF:', contentType);
        return 1;
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // Check if arrayBuffer has minimum PDF size
      if (arrayBuffer.byteLength < 1024) {
        console.warn('PDF file too small or corrupted');
        return 1;
      }

      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();
      console.log('PDF page count loaded successfully:', pageCount);
      return pageCount;
    } catch (error) {
      console.error('Error getting PDF page count:', error);
      // Return 1 as safe default, but also set an error state
      setError('PDF loading failed, using default page settings');
      return 1;
    }
  };

  // Load PDF page count when current file changes
  useEffect(() => {
    if (currentFile?.supabaseUrl) {
      getPDFPageCount(currentFile.supabaseUrl).then(pageCount => {
        setTotalPages(pageCount);
      });
    }
  }, [currentFile?.supabaseUrl]);

  // Update container dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (pdfContainerRef.current) {
        const rect = pdfContainerRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Handle drag over
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Handle drop
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const droppedType = event.dataTransfer.getData('text/plain');
    
    if (!droppedType || !pdfContainerRef.current || !selectedRecipientId) return;

    const containerRect = pdfContainerRef.current.getBoundingClientRect();
    const dropX = event.clientX - containerRect.left;
    const dropY = event.clientY - containerRect.top;

    const containerScale = containerDimensions.width;
    
    const newPosition = convertDragToSignaturePosition({
      type: droppedType,
      x: dropX,
      y: dropY,
      containerScale,
      pageNumber: currentPageNumber,
      recipientId: selectedRecipientId
    });

    if (newPosition) {
      onPositionAdd(newPosition);
    }
  };

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
              isDragOver ? 'ring-2 ring-blue-300 ring-opacity-50 shadow-lg' : ''
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
              {/* PDF content using embed */}
              <embed
                ref={embedRef}
                src={`${currentFile.supabaseUrl}#page=${currentPageNumber}&toolbar=0&navpanes=0&scrollbar=0`}
                type="application/pdf"
                className="w-full h-full min-h-[800px] pointer-events-none"
                title={currentFile.displayName}
                onLoad={() => {
                  setLoading(false);
                  setError(null);
                  // Page count is now loaded dynamically in useEffect
                }}
                onError={() => {
                  setLoading(false);
                  setError('Failed to load PDF');
                }}
              />

              {/* Signature positions overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {currentPagePositions.map(position => {
                  const isSelected = selectedPosition?.key === position.key;
                  const pixelPos = normalizedToPixelPosition(position, containerDimensions);

                  return (
                    <div
                      key={position.key}
                      className={`absolute border-2 bg-blue-50 bg-opacity-70 cursor-pointer transition-all pointer-events-auto ${
                        isSelected
                          ? 'border-blue-500 shadow-lg ring-2 ring-blue-300'
                          : 'border-blue-300 hover:border-blue-400 hover:shadow-md'
                      }`}
                      style={{
                        left: `${pixelPos.x}px`,
                        top: `${pixelPos.y}px`,
                        width: `${pixelPos.width}px`,
                        height: `${pixelPos.height}px`,
                        zIndex: position.zIndex || 1
                      }}
                      onClick={() => onPositionSelect(position)}
                    >
                      <div className="flex items-center justify-center h-full text-xs text-blue-600 font-medium px-1">
                        {position.options?.placeholder || position.type}
                      </div>
                      
                      {/* Delete button for selected position */}
                      {isSelected && (
                        <button
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPositionDelete(position.key);
                          }}
                        >
                          ×
                        </button>
                      )}

                      {/* Resize handles for selected position */}
                      {isSelected && (
                        <>
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Enhanced Pagination */}
          <PDFPagination
            currentPage={currentPageNumber}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedPDFViewer;