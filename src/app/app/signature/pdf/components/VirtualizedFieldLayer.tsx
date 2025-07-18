'use client';

import React, { useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FieldItem, Field } from './FieldItem';

interface VirtualizedFieldLayerProps {
  fields: Field[];
  pageNumber: number;
  pageDimensions: { width: number; height: number };
  activeFieldId: string | null;
  viewportBounds?: { top: number; bottom: number; left: number; right: number };
  onFieldUpdate: (id: string, updates: Partial<Field>) => void;
  onFieldDelete: (id: string) => void;
  onFieldActivate: (id: string) => void;
}

/**
 * Virtualized field layer for performance optimization
 * 用于性能优化的虚拟化字段层
 */
export const VirtualizedFieldLayer: React.FC<VirtualizedFieldLayerProps> = ({
  fields,
  pageNumber,
  pageDimensions,
  activeFieldId,
  viewportBounds,
  onFieldUpdate,
  onFieldDelete,
  onFieldActivate,
}) => {
  // Filter fields for current page
  const pageFields = useMemo(() => 
    fields.filter(field => field.pageNumber === pageNumber),
    [fields, pageNumber]
  );

  // Calculate which fields are visible in viewport
  const visibleFields = useMemo(() => {
    if (!viewportBounds || pageFields.length < 50) {
      // If less than 50 fields, render all
      return pageFields;
    }

    // Filter fields that are within viewport bounds
    return pageFields.filter(field => {
      const fieldLeft = (field.x / 100) * pageDimensions.width;
      const fieldTop = (field.y / 100) * pageDimensions.height;
      const fieldRight = fieldLeft + (field.width / 100) * pageDimensions.width;
      const fieldBottom = fieldTop + (field.height / 100) * pageDimensions.height;

      return !(
        fieldRight < viewportBounds.left ||
        fieldLeft > viewportBounds.right ||
        fieldBottom < viewportBounds.top ||
        fieldTop > viewportBounds.bottom
      );
    });
  }, [pageFields, viewportBounds, pageDimensions]);

  // Render field with performance optimization
  const renderField = useCallback((field: Field) => (
    <div key={field.id} className="pointer-events-auto">
      <FieldItem
        field={field}
        pageWidth={pageDimensions.width}
        pageHeight={pageDimensions.height}
        isActive={field.id === activeFieldId}
        onUpdate={onFieldUpdate}
        onDelete={onFieldDelete}
        onActivate={onFieldActivate}
      />
    </div>
  ), [pageDimensions, activeFieldId, onFieldUpdate, onFieldDelete, onFieldActivate]);

  const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`);
  if (!pageElement) return null;

  return createPortal(
    <div className="absolute inset-0 pointer-events-none">
      {visibleFields.map(renderField)}
      
      {/* Show indicator when fields are virtualized */}
      {pageFields.length > 50 && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs pointer-events-none">
          Showing {visibleFields.length} of {pageFields.length} fields
        </div>
      )}
    </div>,
    pageElement
  );
};