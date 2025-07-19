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
import { Menu, Plus, Undo2, Redo2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Toast } from '@/lib/utils/toast';
import { getRecipientColor } from '@/lib/signature/recipient-colors';

interface ProductionSignatureCanvasProps {
  taskId: string;
  fileUrl: string;
  fileId?: string;
  recipientId: string;
  recipients?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  files?: Array<{
    id: string;
    name: string;
    url: string;
    status?: 'pending' | 'in_progress' | 'completed';
  }>;
  onFileChange?: (fileId: string, fileUrl: string) => void;
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
  recipients = [],
  files = [],
  onFileChange,
}) => {
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [pagesDimensions, setPagesDimensions] = useState<Map<number, { width: number; height: number }>>(new Map());
  const [viewportBounds, setViewportBounds] = useState<Map<number, { top: number; bottom: number; left: number; right: number }>>(new Map());
  const [isMobile, setIsMobile] = useState(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentRecipientId, setCurrentRecipientId] = useState(recipientId);
  const [currentFileId, setCurrentFileId] = useState(fileId);
  const [currentFileUrl, setCurrentFileUrl] = useState(fileUrl);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const { loading, error, fetchFields, createField, updateField, deleteField } = useFieldsApi({
    taskId,
    recipientId: currentRecipientId,
    fileId: currentFileId,
  });

  const { 
    fields, 
    pushState, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useFieldHistory([]);

  const debouncedUpdateField = useDebounce((id: string, updates: Partial<Field>, dimensions?: { width: number; height: number }) => updateField(id, updates, dimensions), 500);
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

  // Load fields on mount and when recipient changes
  useEffect(() => {
    let mounted = true;
    
    const loadFields = async () => {
      console.log('Loading fields for:', { recipientId: currentRecipientId, fileId: currentFileId });
      const loadedFields = await fetchFields();
      console.log('Loaded fields:', loadedFields);
      
      // Validate that all fields have proper UUIDs
      const validFields = loadedFields.filter(field => {
        // Check if ID looks like a UUID (36 chars with dashes)
        const isValidId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(field.id);
        if (!isValidId) {
          console.warn('Skipping field with invalid ID:', field.id);
          return false;
        }
        return true;
      });
      
      if (mounted) {
        pushState(validFields);
      }
    };
    
    loadFields();
    
    return () => {
      mounted = false;
    };
  }, [taskId, currentRecipientId, currentFileId]); // Reload when recipient or file changes
  
  // Reset page navigation when file changes
  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(0);
  }, [currentFileUrl]);

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
        width: Math.min(size.width * 1.2, 40), // Limit mobile width to 40%
        height: Math.min(size.height * 1.2, 20), // Limit mobile height to 20%
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

    // Find current recipient for auto-filling fields
    const currentRecipient = recipients.find(r => r.id === currentRecipientId);
    
    // Auto-fill default values based on field type
    let defaultValue: string | undefined;
    switch (selectedFieldType) {
      case 'name':
        defaultValue = currentRecipient?.name;
        break;
      case 'date':
        // Use a consistent date format: YYYY-MM-DD
        defaultValue = new Date().toLocaleDateString('en-CA');
        break;
      case 'email':
        defaultValue = currentRecipient?.email;
        break;
      default:
        defaultValue = undefined;
    }
    
    // Calculate initial position, ensuring field stays within bounds
    let x = coords.x - size.width / 2;
    let y = coords.y - size.height / 2;
    
    // Ensure field stays within page bounds
    x = Math.max(0, Math.min(x, 100 - size.width));
    y = Math.max(0, Math.min(y, 100 - size.height));
    
    const newField: Field = {
      id: nanoid(),
      type: selectedFieldType,
      recipientId: currentRecipientId,
      pageNumber,
      x,
      y,
      width: size.width,
      height: size.height,
      required: true,
      defaultValue,
    };

    const newFields = [...fields, newField];
    pushState(newFields);
    setActiveFieldId(newField.id);
    setSelectedFieldType(null);
    
    if (isMobile) {
      setIsMobilePaletteOpen(false);
    }

    // Get page dimensions for the current page
    const pageDims = pagesDimensions.get(pageNumber);
    
    const createdField = await createField(newField, pageDims);
    if (!createdField) {
      console.error('Failed to create field in database');
      undo();
      Toast.error('Failed to save field. Please try again.');
    } else {
      console.log('Field created successfully:', createdField);
      // Update the field with the database-generated ID
      const updatedFields = newFields.map(f => 
        f.id === newField.id ? { ...f, id: createdField.id } : f
      );
      pushState(updatedFields);
      setActiveFieldId(createdField.id);
    }
  }, [selectedFieldType, currentRecipientId, recipients, fields, pushState, createField, undo, isMobile, getDefaultFieldSize, calculatePercentageCoords, pagesDimensions]);

  // Handle field update
  const handleFieldUpdate = useCallback((id: string, updates: Partial<Field>) => {
    const newFields = fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    );
    debouncedPushState(newFields);
    
    // Get current page dimensions
    const field = fields.find(f => f.id === id);
    const pageDims = field ? pagesDimensions.get(field.pageNumber) : undefined;
    
    // Ensure we have page dimensions
    if (!pageDims) {
      // Page dimensions might not be ready yet, but we should still update the field
      console.warn('No page dimensions found for field:', id, 'on page:', field?.pageNumber, '- using defaults');
      // Use default dimensions as fallback
      const defaultDims = { width: 595, height: 842 };
      debouncedUpdateField(id, updates, defaultDims);
    } else {
      debouncedUpdateField(id, updates, pageDims);
    }
  }, [fields, debouncedPushState, debouncedUpdateField, pagesDimensions]);

  // Handle field delete
  const handleFieldDelete = useCallback(async (id: string) => {
    console.log('Deleting field:', id);
    const newFields = fields.filter(field => field.id !== id);
    pushState(newFields);
    if (activeFieldId === id) {
      setActiveFieldId(null);
    }

    try {
      const success = await deleteField(id);
      if (!success) {
        console.error('Failed to delete field from database');
        undo();
      } else {
        console.log('Field deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting field:', error);
      undo();
    }
  }, [fields, activeFieldId, pushState, deleteField, undo]);

  // 处理字段激活（点击字段时）
  const handleFieldActivate = useCallback((fieldId: string) => {
    setActiveFieldId(fieldId);
  }, []);

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

  // Navigate to a specific page
  const navigateToPage = useCallback((pageNumber: number) => {
    const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`);
    if (pageElement && scrollContainerRef.current) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNumber);
    }
  }, []);

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
            <>
              <FieldPalette
                selectedType={selectedFieldType}
                onSelectType={setSelectedFieldType}
              />
            </>
          )}
          
          {/* Recipient Selector */}
          {recipients.length > 0 && (
            <div className={`${isMobile ? '' : 'mt-6'} p-3 bg-white rounded-lg shadow-sm`}>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Recipients</h4>
              <div className="space-y-2">
                {recipients.map((recipient, index) => {
                  const color = getRecipientColor(index);
                  return (
                    <button
                      key={recipient.id}
                      onClick={() => setCurrentRecipientId(recipient.id)}
                      className={`w-full text-left p-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        currentRecipientId === recipient.id
                          ? `${color.bg} ${color.text} border-2 ${color.border}`
                          : 'hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${color.dot} flex-shrink-0`} />
                      <div className="flex-1">
                        <div className="font-medium">{recipient.name}</div>
                        <div className="text-xs opacity-75">{recipient.email}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* File Selector */}
          {files.length > 0 && (
            <div className={`${isMobile ? '' : 'mt-6'} p-3 bg-white rounded-lg shadow-sm`}>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Files
              </h4>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <button
                    key={file.id}
                    onClick={() => {
                      setCurrentFileId(file.id);
                      setCurrentFileUrl(file.url);
                      if (onFileChange) {
                        onFileChange(file.id, file.url);
                      }
                    }}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${
                      currentFileId === file.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-300'
                        : 'hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">
                        {files.length > 1 ? `${index + 1}. ` : ''}{file.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
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
      <div className="flex-1 relative">
        {/* Page Navigation - Fixed at top left of PDF */}
        {!isMobile && (
          <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2" style={{ minWidth: '150px' }}>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="px-2 min-w-[80px] text-center">
                <span className="text-xs font-medium">
                  {currentPage} / {totalPages || '...'}
                </span>
              </div>
              
              <button
                onClick={() => navigateToPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-50 transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            {/* Quick page jump buttons - only show for documents with many pages */}
            {totalPages > 5 && (
              <div className="mt-1.5 flex items-center gap-0.5 justify-center">
                {[1, 2, 3].map(page => (
                  <button
                    key={page}
                    onClick={() => navigateToPage(page)}
                    className={`text-xs w-6 h-6 rounded transition-all ${
                      currentPage === page
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <span className="text-gray-400 text-xs mx-1">...</span>
                <button
                  onClick={() => navigateToPage(totalPages)}
                  className={`text-xs w-6 h-6 rounded transition-all ${
                    currentPage === totalPages
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  {totalPages}
                </button>
              </div>
            )}
          </div>
        )}
        
        <div 
          ref={scrollContainerRef}
          className={`h-full overflow-auto bg-gray-100 ${isMobile ? 'pt-14 pb-16' : 'p-4'}`}
        >
          <PDFViewer
            fileUrl={currentFileUrl || '/sample.pdf'} // Fallback to sample PDF for testing
            onPageClick={handlePDFInteraction}
            onDocumentLoad={setTotalPages}
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
                recipients={recipients}
                onFieldUpdate={handleFieldUpdate}
                onFieldDelete={handleFieldDelete}
                onFieldActivate={handleFieldActivate}
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
                  {pageFields.map(field => {
                    const recipientIndex = recipients.findIndex(r => r.id === field.recipientId);
                    const recipient = recipients.find(r => r.id === field.recipientId);
                    const color = recipientIndex >= 0 ? getRecipientColor(recipientIndex) : undefined;
                    
                    return (
                      <div key={field.id} className="pointer-events-auto">
                        <FieldItem
                          field={field}
                          pageWidth={pageDimensions.width}
                          pageHeight={pageDimensions.height}
                          isActive={field.id === activeFieldId}
                          recipientName={recipient?.name}
                          recipientColor={color}
                          onUpdate={handleFieldUpdate}
                          onDelete={handleFieldDelete}
                          onActivate={handleFieldActivate}
                        />
                      </div>
                    );
                  })}
                </div>,
                pageElement
              );
            })
          )}
        </div>
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
      
      {/* Mobile bottom navigation for pages */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-30 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigateToPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex-1 text-center">
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages || '...'}
              </span>
            </div>
            
            <button
              onClick={() => navigateToPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};