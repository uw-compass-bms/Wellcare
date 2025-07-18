'use client';

import React, { useRef, useEffect, useState } from 'react';
import PlacedWidget from '../widgets/PlacedWidget';
import { Widget, RecipientInfo, WidgetType } from '../../types';
import { getWidgetTemplate } from '../widgets/widget-templates';

interface PDFPageProps {
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
  readOnly?: boolean;
}

const PDFPage: React.FC<PDFPageProps> = ({
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
  readOnly = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [draggedType, setDraggedType] = useState<WidgetType | null>(null);

  // 更新容器尺寸
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // 监听容器大小变化
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      observer.disconnect();
    };
  }, []);

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
    // 只有当离开整个容器时才清除拖拽状态
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
    
    // 确保widget不会超出边界
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

  return (
    <div className="relative bg-white shadow-lg mx-auto" style={{ width: '210mm', aspectRatio: '210/297' }}>
      {/* PDF iframe */}
      <iframe
        src={`${fileUrl}#page=${pageNumber}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        className="w-full h-full border-none"
        style={{ 
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          pointerEvents: 'none' // 防止干扰拖拽
        }}
      />

      {/* Widget层 */}
      <div
        ref={containerRef}
        className="absolute inset-0 pointer-events-auto"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleContainerClick}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center'
        }}
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
              scale={1} // 内部缩放由容器处理
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

export default PDFPage;