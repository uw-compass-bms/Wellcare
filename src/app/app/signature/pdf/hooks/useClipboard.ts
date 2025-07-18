import { useState, useCallback } from 'react';
import { Field } from '../components/FieldItem';
import { nanoid } from 'nanoid';

/**
 * Hook for managing clipboard operations (copy/paste)
 * 用于管理剪贴板操作（复制/粘贴）的Hook
 */
export const useClipboard = () => {
  const [clipboard, setClipboard] = useState<Field | null>(null);

  // Copy field to clipboard
  const copyField = useCallback((field: Field) => {
    setClipboard(field);
    // Also copy to system clipboard as JSON
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(field))
        .catch(err => console.warn('Failed to copy to system clipboard:', err));
    }
    return true;
  }, []);

  // Paste field from clipboard
  const pasteField = useCallback((pageNumber: number, position?: { x: number; y: number }): Field | null => {
    if (!clipboard) return null;

    // Create new field with new ID and position
    const newField: Field = {
      ...clipboard,
      id: nanoid(),
      pageNumber,
      // Offset position slightly to show it's a new field
      x: position?.x ?? (clipboard.x + 2),
      y: position?.y ?? (clipboard.y + 2),
    };

    return newField;
  }, [clipboard]);

  // Clear clipboard
  const clearClipboard = useCallback(() => {
    setClipboard(null);
  }, []);

  // Check if paste is available
  const canPaste = clipboard !== null;

  return {
    copyField,
    pasteField,
    clearClipboard,
    canPaste,
    clipboardField: clipboard,
  };
};