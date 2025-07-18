'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import PlacedWidget from '../widgets/PlacedWidget';
import { Widget, RecipientInfo, WidgetType } from '../../types';
import { getWidgetTemplate } from '../widgets/widget-templates';

// 设置PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface ReactPDFPageProps {
  fileUrl: string;
  pageNumber: number;
  scale: number;
  widgets: Widget[];
  recipients: RecipientInfo[];
  selectedWidget: string | null;
  selectedRecipient: RecipientInfo;
  onWidgetSelect: (widgetId: string | null) => void;
  onWidgetUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  onWidgetDelete: (widgetId: string) => void;
  onWidgetDrop: (position: { x: number; y: number }, type: WidgetType) => void;
  onPageLoadSuccess?: (pageInfo: { width: number; height: number }) => void;
  readOnly?: boolean;
}

const ReactPDFPage: React.FC<ReactPDFPageProps> = ({
  fileUrl,
  pageNumber,
  scale,
  widgets,
  recipients,
  selectedWidget,
  selectedRecipient,
  onWidgetSelect,
  onWidgetUpdate,
  onWidgetDelete,
  onWidgetDrop,
  onPageLoadSuccess,
  readOnly = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [draggedType, setDraggedType] = useState<WidgetType | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 处理文档加载成功
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  };

  // 处理页面加载成功
  const onPageLoadSuccessHandler = (page: any) => {
    const { width, height } = page;
    setContainerDimensions({ width, height });
    onPageLoadSuccess?.({ width, height });
  };

  // 处理加载错误
  const onDocumentLoadError = (error: any) => {
    console.error('PDF load error:', error);
    setError('Failed to load PDF. The file might be corrupted or inaccessible.');
    setIsLoading(false);
  };

  // 处理拖拽进入
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // 处理拖拽进入容器
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain') as WidgetType;
    if (type) {
      setDraggedType(type);
    }
  };

  // 处理拖拽离开容器
  const handleDragLeave = (e: React.DragEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setDraggedType(null);
    }
  };

  // 处理放置
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedType(null);

    if (readOnly || !containerRef.current) return;

    const type = e.dataTransfer.getData('text/plain') as WidgetType;
    if (!type) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const template = getWidgetTemplate(type);
    
    const finalX = Math.max(0, Math.min(100 - template.defaultSize.width, x));
    const finalY = Math.max(0, Math.min(100 - template.defaultSize.height, y));

    onWidgetDrop({ x: finalX, y: finalY }, type);
  };

  // 获取当前页面的widgets
  const currentPageWidgets = widgets.filter(w => w.page === pageNumber);

  // 点击空白区域取消选择
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onWidgetSelect(null);
    }
  };

  if (error) {
    return (
      <div className="relative bg-white shadow-lg mx-auto flex items-center justify-center" 
           style={{ width: '210mm', aspectRatio: '210/297' }}>
        <div className="text-center p-8">
          <div className="text-red-600 text-lg font-semibold mb-2">PDF Load Error</div>
          <div className="text-gray-600 text-sm mb-4">{error}</div>
          <div className="text-xs text-gray-500">URL: {fileUrl}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white shadow-lg mx-auto" style={{ width: '210mm', aspectRatio: '210/297' }}>
      {/* PDF Document */}
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <div className="text-gray-600 text-sm">Loading PDF...</div>
            </div>
          </div>
        }
        error={
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-8">
              <div className="text-red-600 text-lg font-semibold mb-2">Failed to Load PDF</div>
              <div className="text-gray-600 text-sm mb-4">
                The PDF file could not be loaded. Please check the file URL or try uploading the file again.
              </div>
              <div className="text-xs text-gray-500 break-all">URL: {fileUrl}</div>
            </div>
          </div>
        }
        noData={
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-sm">No PDF file available</div>
          </div>
        }
      >
        <Page
          pageNumber={pageNumber}
          scale={scale}
          onLoadSuccess={onPageLoadSuccessHandler}
          className="mx-auto"
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>

      {/* Widget层 */}
      <div
        ref={containerRef}
        className="absolute inset-0 pointer-events-auto"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleContainerClick}
      >
        {/* 拖拽指示器 */}
        {draggedType && (
          <div className="absolute inset-0 bg-blue-100 bg-opacity-50 border-2 border-dashed border-blue-400 rounded flex items-center justify-center">
            <div className="text-blue-600 font-medium">
              Drop {getWidgetTemplate(draggedType).label} here
            </div>
          </div>
        )}

        {/* 放置的widgets */}
        {currentPageWidgets.map((widget) => {
          const recipient = recipients.find(r => r.id === widget.recipientId);
          return (
            <PlacedWidget
              key={widget.id}
              widget={widget}
              recipient={recipient}
              isSelected={selectedWidget === widget.id}
              scale={1}
              containerWidth={containerDimensions.width}
              containerHeight={containerDimensions.height}
              onSelect={() => onWidgetSelect(widget.id)}
              onUpdate={(updates) => onWidgetUpdate(widget.id, updates)}
              onDelete={() => onWidgetDelete(widget.id)}
              readOnly={readOnly}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ReactPDFPage;