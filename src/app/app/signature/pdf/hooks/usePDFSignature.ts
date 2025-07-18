'use client';

import { useState, useCallback, useEffect } from 'react';
import { Widget, WidgetType, PDFSignatureState, PDFSignatureActions, RecipientInfo } from '../types';
import { getWidgetTemplate } from '../components/widgets/widget-templates';

interface UsePDFSignatureProps {
  taskId: string;
  initialWidgets?: Widget[];
  onSave?: (widgets: Widget[]) => Promise<void>;
}

export const usePDFSignature = ({ 
  taskId, 
  initialWidgets = [], 
  onSave 
}: UsePDFSignatureProps) => {
  // 状态
  const [state, setState] = useState<PDFSignatureState>({
    widgets: initialWidgets,
    selectedWidget: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1.0,
    dragState: {
      isDragging: false,
      dragType: null,
      dragPosition: null
    },
    isLoading: false,
    error: null
  });

  // Actions
  const actions: PDFSignatureActions = {
    addWidget: useCallback((widgetData: Omit<Widget, 'id'>) => {
      const newWidget: Widget = {
        ...widgetData,
        id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      setState(prev => ({
        ...prev,
        widgets: [...prev.widgets, newWidget],
        selectedWidget: newWidget.id
      }));
    }, []),

    updateWidget: useCallback((id: string, updates: Partial<Widget>) => {
      setState(prev => ({
        ...prev,
        widgets: prev.widgets.map(w => 
          w.id === id ? { ...w, ...updates } : w
        )
      }));
    }, []),

    deleteWidget: useCallback((id: string) => {
      setState(prev => ({
        ...prev,
        widgets: prev.widgets.filter(w => w.id !== id),
        selectedWidget: prev.selectedWidget === id ? null : prev.selectedWidget
      }));
    }, []),

    selectWidget: useCallback((id: string | null) => {
      setState(prev => ({
        ...prev,
        selectedWidget: id
      }));
    }, []),

    setCurrentPage: useCallback((page: number) => {
      setState(prev => ({
        ...prev,
        currentPage: page,
        selectedWidget: null // 切换页面时取消选择
      }));
    }, []),

    setScale: useCallback((scale: number) => {
      setState(prev => ({
        ...prev,
        scale
      }));
    }, []),

    setDragState: useCallback((dragState: Partial<typeof state.dragState>) => {
      setState(prev => ({
        ...prev,
        dragState: { ...prev.dragState, ...dragState }
      }));
    }, []),

    loadWidgets: useCallback((widgets: Widget[]) => {
      setState(prev => ({
        ...prev,
        widgets,
        selectedWidget: null
      }));
    }, []),

    clearError: useCallback(() => {
      setState(prev => ({
        ...prev,
        error: null
      }));
    }, [])
  };

  // 辅助函数
  const handleWidgetDrop = useCallback((
    position: { x: number; y: number }, 
    type: WidgetType,
    selectedRecipient: RecipientInfo
  ) => {
    const template = getWidgetTemplate(type);
    
    const newWidget = {
      type,
      page: state.currentPage,
      x: Math.max(0, Math.min(100 - template.defaultSize.width, position.x)),
      y: Math.max(0, Math.min(100 - template.defaultSize.height, position.y)),
      width: template.defaultSize.width,
      height: template.defaultSize.height,
      value: '',
      placeholder: `Enter ${template.label}`,
      recipientId: selectedRecipient.id,
      isRequired: false
    };

    actions.addWidget(newWidget);
    actions.setDragState({ isDragging: false, dragType: null, dragPosition: null });
  }, [state.currentPage, actions]);

  // 保存widgets
  const saveWidgets = useCallback(async () => {
    if (!onSave) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await onSave(state.widgets);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save widgets'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.widgets, onSave]);

  // 获取当前页面的widgets
  const getCurrentPageWidgets = useCallback(() => {
    return state.widgets.filter(w => w.page === state.currentPage);
  }, [state.widgets, state.currentPage]);

  // 获取选中的widget
  const getSelectedWidget = useCallback(() => {
    return state.widgets.find(w => w.id === state.selectedWidget) || null;
  }, [state.widgets, state.selectedWidget]);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete键删除选中的widget
      if (e.key === 'Delete' && state.selectedWidget) {
        e.preventDefault();
        actions.deleteWidget(state.selectedWidget);
      }
      
      // Escape键取消选择
      if (e.key === 'Escape') {
        e.preventDefault();
        actions.selectWidget(null);
      }
      
      // 复制widget (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && state.selectedWidget) {
        e.preventDefault();
        // 这里可以实现复制功能
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedWidget, actions]);

  return {
    state,
    actions,
    handleWidgetDrop,
    saveWidgets,
    getCurrentPageWidgets,
    getSelectedWidget
  };
};