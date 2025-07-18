'use client';

import React, { useState, useEffect } from 'react';
import PDFPage from './PDFPage';
import PDFNavigation from './PDFNavigation';
import PDFZoomControls from './PDFZoomControls';
import { PDFRendererProps } from '../../types';

const PDFRenderer: React.FC<PDFRendererProps> = ({
  file,
  scale,
  currentPage,
  widgets,
  selectedWidget,
  onWidgetSelect,
  onWidgetUpdate,
  onWidgetDelete,
  onWidgetDrop,
  readOnly = false
}) => {
  const [totalPages, setTotalPages] = useState(file.pageCount || 1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 这里可以添加获取PDF总页数的逻辑
    // 目前使用文件信息中的页数，或默认为1
    setTotalPages(file.pageCount || 1);
    setIsLoading(false);
  }, [file]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-gray-600">Loading PDF...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* PDF工具栏 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* 左侧：页面导航 */}
          <PDFNavigation
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={() => {}} // 这个会在父组件中处理
          />

          {/* 右侧：缩放控制 */}
          <PDFZoomControls
            scale={scale}
            onScaleChange={() => {}} // 这个会在父组件中处理
          />
        </div>
      </div>

      {/* PDF显示区域 */}
      <div className="flex-1 overflow-auto p-8">
        <div className="flex justify-center">
          <PDFPage
            fileUrl={file.supabaseUrl}
            pageNumber={currentPage}
            scale={scale}
            widgets={widgets}
            recipients={[]} // 这个会在父组件中传入
            selectedWidget={selectedWidget}
            selectedRecipient={{} as any} // 这个会在父组件中传入
            onWidgetSelect={onWidgetSelect}
            onWidgetUpdate={onWidgetUpdate}
            onWidgetDelete={onWidgetDelete}
            onWidgetDrop={onWidgetDrop}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* 底部页面导航（可选） */}
      {totalPages > 1 && (
        <div className="bg-white border-t border-gray-200 py-3">
          <PDFNavigation
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={() => {}} // 这个会在父组件中处理
            className="justify-center"
          />
        </div>
      )}
    </div>
  );
};

export default PDFRenderer;