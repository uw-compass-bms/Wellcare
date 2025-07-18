'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PDFHeader from './PDFHeader';
import WidgetPalette from '../widgets/WidgetPalette';
import PDFPage from '../pdf/PDFPage';
import PDFNavigation from '../pdf/PDFNavigation';
import PDFZoomControls from '../pdf/PDFZoomControls';
import RecipientSelector from '../ui/RecipientSelector';
import WidgetPropertiesPanel from '../ui/WidgetPropertiesPanel';
import { usePDFSignature } from '../../hooks/usePDFSignature';
import { PDFSignatureProps, RecipientInfo, FileInfo } from '../../types';
import { getAllWidgetTemplates } from '../widgets/widget-templates';

const PDFSignatureLayout: React.FC<PDFSignatureProps> = ({
  taskId,
  files,
  recipients,
  onSave,
  onSend,
  readOnly = false
}) => {
  const router = useRouter();
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientInfo>(recipients[0]);
  const [currentFile, setCurrentFile] = useState<FileInfo>(files[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const {
    state,
    actions,
    handleWidgetDrop,
    saveWidgets,
    getCurrentPageWidgets,
    getSelectedWidget
  } = usePDFSignature({
    taskId,
    onSave: async (widgets) => {
      if (onSave) {
        await onSave(widgets);
      }
    }
  });

  // 确保有默认选中的收件人
  useEffect(() => {
    if (recipients.length > 0 && !selectedRecipient) {
      setSelectedRecipient(recipients[0]);
    }
  }, [recipients, selectedRecipient]);

  // 确保有默认文件
  useEffect(() => {
    if (files.length > 0 && !currentFile) {
      setCurrentFile(files[0]);
    }
  }, [files, currentFile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveWidgets();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSend = async () => {
    if (!onSend) return;
    
    setIsSending(true);
    try {
      await onSend();
    } finally {
      setIsSending(false);
    }
  };

  const handleGoBack = () => {
    router.push('/app/signature');
  };

  const currentPageWidgets = getCurrentPageWidgets();
  const selectedWidget = getSelectedWidget();
  const selectedWidgetRecipient = selectedWidget 
    ? recipients.find(r => r.id === selectedWidget.recipientId)
    : null;

  const widgetTemplates = getAllWidgetTemplates();

  if (!currentFile || !selectedRecipient) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading PDF signature editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部头部 */}
      <PDFHeader
        taskTitle={`PDF Signature - ${currentFile.displayName}`}
        fileCount={files.length}
        recipientCount={recipients.length}
        isSaving={isSaving}
        isSending={isSending}
        onGoBack={handleGoBack}
        onSave={handleSave}
        onSend={handleSend}
      />

      {/* 收件人选择器 */}
      <RecipientSelector
        recipients={recipients}
        selectedRecipient={selectedRecipient}
        onRecipientSelect={setSelectedRecipient}
      />

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：Widget调色板 */}
        <WidgetPalette
          templates={widgetTemplates}
          selectedRecipient={selectedRecipient}
          onDragStart={(type) => {
            actions.setDragState({ isDragging: true, dragType: type });
          }}
          onDragEnd={() => {
            actions.setDragState({ isDragging: false, dragType: null });
          }}
        />

        {/* 中间：PDF渲染区域 */}
        <div className="flex-1 flex flex-col">
          {/* PDF工具栏 */}
          <div className="bg-white border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              {/* 页面导航 */}
              <PDFNavigation
                currentPage={state.currentPage}
                totalPages={currentFile.pageCount || 1}
                onPageChange={actions.setCurrentPage}
              />

              {/* 缩放控制 */}
              <PDFZoomControls
                scale={state.scale}
                onScaleChange={actions.setScale}
              />
            </div>
          </div>

          {/* PDF显示区域 */}
          <div className="flex-1 overflow-auto p-8">
            <div className="flex justify-center">
              <PDFPage
                fileUrl={currentFile.supabaseUrl}
                pageNumber={state.currentPage}
                scale={state.scale}
                widgets={currentPageWidgets}
                recipients={recipients}
                selectedWidget={state.selectedWidget}
                selectedRecipient={selectedRecipient}
                onWidgetSelect={actions.selectWidget}
                onWidgetUpdate={actions.updateWidget}
                onWidgetDelete={actions.deleteWidget}
                onWidgetDrop={(position, type) => 
                  handleWidgetDrop(position, type, selectedRecipient)
                }
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>

        {/* 右侧：Widget属性面板 */}
        <WidgetPropertiesPanel
          widget={selectedWidget}
          recipient={selectedWidgetRecipient}
          onUpdate={(updates) => {
            if (selectedWidget) {
              actions.updateWidget(selectedWidget.id, updates);
            }
          }}
          onDelete={() => {
            if (selectedWidget) {
              actions.deleteWidget(selectedWidget.id);
            }
          }}
        />
      </div>

      {/* 错误提示 */}
      {state.error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm">{state.error}</span>
            <button
              onClick={actions.clearError}
              className="ml-2 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFSignatureLayout;