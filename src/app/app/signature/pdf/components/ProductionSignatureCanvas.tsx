'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PDFViewer } from './PDFViewer';
import { FieldPalette, FieldType } from './FieldPalette';
import { MobileFieldPalette } from './MobileFieldPalette';
import { FieldItem, Field } from './FieldItem';
import { VirtualizedFieldLayer } from './VirtualizedFieldLayer';
import { nanoid } from 'nanoid';
import { useFieldsApi } from '../hooks/useFieldsApi';
import { useDebounce } from '../hooks/useDebounce';
import { useFieldHistory } from '../hooks/useFieldHistory';
import { Menu, Plus, Undo2, Redo2 } from 'lucide-react';

interface ProductionSignatureCanvasProps {
  taskId: string;
  fileUrl: string;
  fileId?: string;
  recipientId: string;
}

/**
 * Production-optimized signature canvas
 * Combines all necessary features for production use
 */
export const ProductionSignatureCanvas: React.FC<ProductionSignatureCanvasProps> = ({
  taskId,
  fileUrl,
  fileId,
  recipientId,
}) => {
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [pagesDimensions, setPagesDimensions] = useState<Map<number, { width: number; height: number }>>(new Map());
  const [viewportBounds, setViewportBounds] = useState<Map<number, any>>(new Map());
  const [isMobile, setIsMobile] = useState(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { loading, error, fetchFields, createField, updateField, deleteField } = useFieldsApi({
    taskId,
    recipientId,
    fileId,
  });

  const { 
    fields, 
    pushState, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useFieldHistory([]);

  const debouncedUpdateField = useDebounce(updateField, 500);
  const debouncedPushState = useDebounce(pushState, 300);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setIsSidebarOpen(window.innerWidth >= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load fields on mount - only once
  useEffect(() => {
    let mounted = true;
    
    const loadFields = async () => {
      const loadedFields = await fetchFields();
      if (mounted) {
        pushState(loadedFields);
      }
    };
    
    loadFields();
    
    return () => {
      mounted = false;
    };
  }, [taskId, recipientId, fileId]); // Only reload when these change

  // Update page dimensions
  const updatePageDimensions = useDebounce(() => {
    const newDimensions = new Map<number, { width: number; height: number }>();
    const pages = document.querySelectorAll('[data-page-number]');
    
    pages.forEach((page) => {
      const pageNumber = parseInt(page.getAttribute('data-page-number') || '0');
      const rect = page.getBoundingClientRect();
      newDimensions.set(pageNumber, { width: rect.width, height: rect.height });
    });
    
    setPagesDimensions(newDimensions);
  }, 100);

  // Track viewport for virtualization
  const updateViewportBounds = useDebounce(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const newBounds = new Map();

    const pages = container.querySelectorAll('[data-page-number]');
    pages.forEach((page) => {
      const pageNumber = parseInt(page.getAttribute('data-page-number') || '0');
      const pageRect = page.getBoundingClientRect();
      
      newBounds.set(pageNumber, {
        top: Math.max(0, containerRect.top - pageRect.top),
        bottom: Math.min(pageRect.height, containerRect.bottom - pageRect.top),
        left: Math.max(0, containerRect.left - pageRect.left),
        right: Math.min(pageRect.width, containerRect.right - pageRect.left),
      });
    });

    setViewportBounds(newBounds);
  }, 100);

  useEffect(() => {
    const handleResize = () => {
      updatePageDimensions();
      updateViewportBounds();
    };

    const handleScroll = () => {
      updateViewportBounds();
    };

    const timer = setTimeout(() => {
      updatePageDimensions();
      updateViewportBounds();
    }, 500);

    window.addEventListener('resize', handleResize);
    scrollContainerRef.current?.addEventListener('scroll', handleScroll);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      scrollContainerRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, [updatePageDimensions, updateViewportBounds]);

  // Field operations
  const getDefaultFieldSize = useCallback((type: FieldType) => {
    const baseSize = {
      signature: { width: 15, height: 8 },
      date: { width: 12, height: 5 },
      text: { width: 20, height: 5 },
      name: { width: 20, height: 5 },
      email: { width: 25, height: 5 },
      number: { width: 10, height: 5 },
      checkbox: { width: 5, height: 5 },
    };
    
    if (isMobile) {
      const size = baseSize[type] || { width: 15, height: 5 };
      return {
        width: size.width * 1.5,
        height: size.height * 1.5,
      };
    }
    
    return baseSize[type] || { width: 15, height: 5 };
  }, [isMobile]);

  const calculatePercentageCoords = useCallback((event: React.MouseEvent | React.TouchEvent, pageElement: Element) => {
    const rect = pageElement.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x, y };
  }, []);

  // Handle PDF interaction
  const handlePDFInteraction = useCallback(async (event: React.MouseEvent | React.TouchEvent, pageNumber: number) => {
    if (!selectedFieldType) return;

    const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`);
    if (!pageElement) return;

    const coords = calculatePercentageCoords(event, pageElement);
    const size = getDefaultFieldSize(selectedFieldType);

    const newField: Field = {
      id: nanoid(),
      type: selectedFieldType,
      recipientId,
      pageNumber,
      x: coords.x - size.width / 2,
      y: coords.y - size.height / 2,
      width: size.width,
      height: size.height,
      required: true,
    };

    const newFields = [...fields, newField];
    pushState(newFields);
    setActiveFieldId(newField.id);
    setSelectedFieldType(null);
    
    if (isMobile) {
      setIsMobilePaletteOpen(false);
    }

    const createdField = await createField(newField);
    if (!createdField) {
      undo();
    }
  }, [selectedFieldType, recipientId, fields, pushState, createField, undo, isMobile, getDefaultFieldSize, calculatePercentageCoords]);

  // Handle field update
  const handleFieldUpdate = useCallback((id: string, updates: Partial<Field>) => {
    const newFields = fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    );
    debouncedPushState(newFields);
    debouncedUpdateField(id, updates);
  }, [fields, debouncedPushState, debouncedUpdateField]);

  // Handle field delete
  const handleFieldDelete = useCallback(async (id: string) => {
    const newFields = fields.filter(field => field.id !== id);
    pushState(newFields);
    if (activeFieldId === id) {
      setActiveFieldId(null);
    }

    const success = await deleteField(id);
    if (!success) {
      undo();
    }
  }, [fields, activeFieldId, pushState, deleteField, undo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeFieldId && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        handleFieldDelete(activeFieldId);
      }
      
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) undo();
      }
      
      if ((event.metaKey || event.ctrlKey) && (event.key === 'y' || (event.shiftKey && event.key === 'z'))) {
        event.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFieldId, canUndo, canRedo, handleFieldDelete, undo, redo]);

  // Check if we should use virtualization
  const useVirtualization = fields.length > 50;

  return (
    <div className="signature-canvas flex h-full relative">
      {/* Mobile header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 bg-white border-b z-30 px-4 py-2 flex items-center justify-between md:hidden">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => canUndo && undo()}
              disabled={!canUndo}
              className={`p-2 rounded ${canUndo ? 'text-gray-700' : 'text-gray-300'}`}
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => canRedo && redo()}
              disabled={!canRedo}
              className={`p-2 rounded ${canRedo ? 'text-gray-700' : 'text-gray-300'}`}
            >
              <Redo2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsMobilePaletteOpen(true)}
              className="p-2 bg-blue-500 text-white rounded-lg"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Sidebar - desktop always visible, mobile slide-in */}
      <div
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-40' : 'relative'}
          w-64 bg-gray-50 border-r transform transition-transform duration-300
          ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
        `}
      >
        <div className="h-full overflow-y-auto p-4 pt-16 md:pt-4">
          {/* Desktop field palette */}
          {!isMobile && (
            <FieldPalette
              selectedType={selectedFieldType}
              onSelectType={setSelectedFieldType}
            />
          )}
          
          {/* Field stats */}
          <div className={`${isMobile ? '' : 'mt-6'} p-3 bg-white rounded-lg shadow-sm`}>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Summary</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <p>Total fields: {fields.length}</p>
              <p>Required fields: {fields.filter(f => f.required).length}</p>
              {useVirtualization && (
                <p className="text-blue-600">Performance mode active</p>
              )}
            </div>
          </div>
          
          {/* Status */}
          {loading && (
            <div className="mt-4 p-2 bg-blue-50 text-blue-700 text-xs rounded">
              Saving changes...
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-2 bg-red-50 text-red-700 text-xs rounded">
              Error: {error}
            </div>
          )}
        </div>
      </div>

      {/* Backdrop for mobile sidebar */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* PDF viewing area */}
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-auto bg-gray-100 ${isMobile ? 'pt-14' : 'p-4'}`}
      >
        <PDFViewer
          fileUrl={fileUrl || '/sample.pdf'} // Fallback to sample PDF for testing
          onPageClick={handlePDFInteraction}
          className={selectedFieldType ? 'cursor-crosshair' : ''}
        />
        
        {/* Render fields with virtualization if needed */}
        {useVirtualization ? (
          Array.from(pagesDimensions.entries()).map(([pageNumber, dimensions]) => (
            <VirtualizedFieldLayer
              key={pageNumber}
              fields={fields}
              pageNumber={pageNumber}
              pageDimensions={dimensions}
              activeFieldId={activeFieldId}
              viewportBounds={viewportBounds.get(pageNumber)}
              onFieldUpdate={handleFieldUpdate}
              onFieldDelete={handleFieldDelete}
              onFieldActivate={setActiveFieldId}
            />
          ))
        ) : (
          Array.from(pagesDimensions.keys()).map(pageNumber => {
            const pageDimensions = pagesDimensions.get(pageNumber);
            if (!pageDimensions) return null;

            const pageFields = fields.filter(field => field.pageNumber === pageNumber);
            const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`);
            if (!pageElement) return null;

            return createPortal(
              <div key={pageNumber} className="absolute inset-0 pointer-events-none">
                {pageFields.map(field => (
                  <div key={field.id} className="pointer-events-auto">
                    <FieldItem
                      field={field}
                      pageWidth={pageDimensions.width}
                      pageHeight={pageDimensions.height}
                      isActive={field.id === activeFieldId}
                      onUpdate={handleFieldUpdate}
                      onDelete={handleFieldDelete}
                      onActivate={setActiveFieldId}
                    />
                  </div>
                ))}
              </div>,
              pageElement
            );
          })
        )}
      </div>

      {/* Mobile field palette */}
      {isMobile && (
        <MobileFieldPalette
          selectedType={selectedFieldType}
          onSelectType={setSelectedFieldType}
          isOpen={isMobilePaletteOpen}
          onClose={() => setIsMobilePaletteOpen(false)}
        />
      )}
    </div>
  );
};