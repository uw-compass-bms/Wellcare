import { useState, useCallback, useRef } from 'react';
import { Field } from '../components/FieldItem';

interface HistoryState {
  fields: Field[];
  timestamp: number;
}

/**
 * Hook for managing field history (undo/redo)
 * 用于管理字段历史记录（撤销/重做）的Hook
 */
export const useFieldHistory = (initialFields: Field[] = []) => {
  const [history, setHistory] = useState<HistoryState[]>([
    { fields: initialFields, timestamp: Date.now() }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isUpdating = useRef(false);

  // Get current fields
  const currentFields = history[currentIndex]?.fields || [];

  // Add new state to history
  const pushState = useCallback((fields: Field[]) => {
    if (isUpdating.current) return;
    
    setHistory(prev => {
      // Remove any states after current index (clear redo stack)
      const newHistory = prev.slice(0, currentIndex + 1);
      // Add new state
      newHistory.push({ fields, timestamp: Date.now() });
      
      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
      } else {
        setCurrentIndex(newHistory.length - 1);
      }
      
      return newHistory;
    });
  }, [currentIndex]);

  // Undo
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      isUpdating.current = true;
      setCurrentIndex(prev => prev - 1);
      setTimeout(() => { isUpdating.current = false; }, 100);
      return true;
    }
    return false;
  }, [currentIndex]);

  // Redo
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      isUpdating.current = true;
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => { isUpdating.current = false; }, 100);
      return true;
    }
    return false;
  }, [currentIndex, history.length]);

  // Check if actions are available
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    fields: currentFields,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    historyLength: history.length,
    currentIndex,
  };
};