'use client';

import React, { useState, useRef } from 'react';
import { convertDragEventToPosition } from '@/lib/utils/coordinates';

interface FileInfo {
  id: string;
  originalFilename: string;
  displayName: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
  supabaseUrl: string;
}

interface SignaturePosition {
  id?: string;
  recipientId: string;
  fileId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  placeholderText?: string;
}

interface SimplePDFViewerProps {
  files: FileInfo[];
  currentFileId: string;
  currentPageNumber: number;
  positions: SignaturePosition[];
  selectedPosition: SignaturePosition | null;
  onPositionSelect: (position: SignaturePosition | null) => void;
  onPositionUpdate: (position: SignaturePosition) => void;
  onPositionDelete: (positionId: string) => void;
  onPositionAdd?: (position: Omit<SignaturePosition, 'id'>) => void;
}

export default function SimplePDFViewer({
  files,
  currentFileId,
  currentPageNumber,
  positions,
  selectedPosition,
  onPositionSelect,
  onPositionUpdate,
  onPositionDelete,
  onPositionAdd
}: SimplePDFViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const currentFile = files.find(f => f.id === currentFileId);
  const currentPagePositions = positions.filter(
    p => p.fileId === currentFileId && p.pageNumber === currentPageNumber
  );

  // 调试日志
  console.log('SimplePDFViewer - Current file:', currentFile);
  console.log('SimplePDFViewer - File URL:', currentFile?.supabaseUrl);

  // 处理拖拽开始事件（从父组件传递）
  const handleDragStart = (event: React.DragEvent, itemType: string) => {
    setDraggedItem(itemType);
    event.dataTransfer.setData('text/plain', itemType);
    event.dataTransfer.effectAllowed = 'copy';
  };

  // 处理拖拽悬停
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  // 处理拖拽离开
  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
  };

  // 处理拖拽放置（使用坐标转换工具）
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDraggedItem(null);

    if (!pdfContainerRef.current || !onPositionAdd) {
      return;
    }

    const itemType = event.dataTransfer.getData('text/plain');
    if (!itemType) {
      return;
    }

    try {
      // 使用坐标转换工具计算精确位置
      const positionData = convertDragEventToPosition(
        event,
        pdfContainerRef.current,
        itemType,
        currentFileId,
        currentPageNumber
      );

      console.log('拖拽位置数据:', {
        itemType,
        pixelPosition: positionData.pixelPosition,
        percentagePosition: positionData.percentagePosition,
        containerDimensions: positionData.containerDimensions
      });

      // 创建新的签名位置（使用像素坐标，API会自动转换为百分比）
      const newPosition: Omit<SignaturePosition, 'id'> = {
        recipientId: 'temp-recipient', // 临时值，稍后需要从实际收件人中选择
        fileId: currentFileId,
        pageNumber: currentPageNumber,
        x: positionData.pixelPosition.x,
        y: positionData.pixelPosition.y,
        width: positionData.pixelPosition.width,
        height: positionData.pixelPosition.height,
        placeholderText: getPlaceholderText(itemType)
      };

      console.log('新建签名位置:', newPosition);
      onPositionAdd(newPosition);

    } catch (error) {
      console.error('拖拽位置计算错误:', error);
      // Fallback to simple calculation
      const rect = pdfContainerRef.current.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const relativeY = event.clientY - rect.top;
      
      const newPosition: Omit<SignaturePosition, 'id'> = {
        recipientId: 'temp-recipient',
        fileId: currentFileId,
        pageNumber: currentPageNumber,
        x: Math.max(0, relativeX - 60),
        y: Math.max(0, relativeY - 20),
        width: 120,
        height: 40,
        placeholderText: getPlaceholderText(itemType)
      };

      onPositionAdd(newPosition);
    }
  };

  // 根据拖拽类型获取占位符文本
  const getPlaceholderText = (itemType: string): string => {
    switch (itemType) {
      case 'signature':
        return 'Click to sign';
      case 'date':
        return 'Date';
      case 'text':
        return 'Text field';
      default:
        return 'Click here';
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2">No File Selected</h3>
          <p className="text-sm">Please select a file to view</p>
        </div>
      </div>
    );
  }

  if (!currentFile.supabaseUrl) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="text-center text-red-500">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium mb-2">Invalid File URL</h3>
          <p className="text-sm">The PDF file URL is missing or invalid</p>
          <p className="text-xs mt-2 text-gray-500">URL: {currentFile.supabaseUrl}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-100 overflow-auto">
      <div className="max-w-4xl mx-auto py-8">
        {/* 文件信息 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">{currentFile.displayName}</h3>
              <p className="text-sm text-gray-600">
                Page {currentPageNumber}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {currentPagePositions.length} signature position(s) on this page
            </div>
          </div>
        </div>

        {/* PDF 显示区域 - 支持拖拽 */}
        <div 
          className={`bg-white rounded-lg shadow-sm overflow-hidden transition-all ${
            draggedItem ? 'ring-2 ring-blue-300 ring-opacity-50' : ''
          }`}
        >
          <div 
            ref={pdfContainerRef}
            data-pdf-container
            className="relative min-h-[800px]"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* 使用iframe显示PDF */}
            <iframe
              src={`${currentFile.supabaseUrl}#page=${currentPageNumber}`}
              className="w-full h-full min-h-[800px] border-0"
              title={currentFile.displayName}
              onLoad={() => {
                setLoading(false);
                setError(null);
              }}
              onError={() => {
                setLoading(false);
                setError('Failed to load PDF');
              }}
            />

            {/* 拖拽提示覆盖层 */}
            {draggedItem && (
              <div className="absolute inset-0 bg-blue-50 bg-opacity-80 flex items-center justify-center pointer-events-none z-10">
                <div className="text-center text-blue-600">
                  <div className="text-4xl mb-2">📝</div>
                  <div className="text-lg font-medium">Drop here to add signature position</div>
                  <div className="text-sm">Release to place a {draggedItem} field</div>
                </div>
              </div>
            )}

            {/* 加载状态 */}
            {loading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading PDF...</p>
                </div>
              </div>
            )}

            {/* 错误状态 */}
            {error && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20">
                <div className="text-center text-red-500">
                  <div className="text-6xl mb-4">❌</div>
                  <h3 className="text-lg font-medium mb-2">Error Loading PDF</h3>
                  <p className="text-sm">{error}</p>
                  <p className="text-xs mt-2 text-gray-500">URL: {currentFile.supabaseUrl}</p>
                </div>
              </div>
            )}

            {/* 渲染签名位置框 */}
            <div className="absolute inset-0 pointer-events-none z-30">
              {currentPagePositions.map((position) => (
                <div
                  key={position.id || `${position.x}-${position.y}`}
                  className={`absolute border-2 bg-blue-50 bg-opacity-70 cursor-pointer transition-all pointer-events-auto ${
                    selectedPosition?.id === position.id
                      ? 'border-blue-500 shadow-lg'
                      : 'border-blue-300 hover:border-blue-400'
                  }`}
                  style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: `${position.width}px`,
                    height: `${position.height}px`,
                  }}
                  onClick={() => onPositionSelect(position)}
                >
                  <div className="flex items-center justify-center h-full text-xs text-blue-600 font-medium">
                    {position.placeholderText || 'Signature'}
                  </div>
                  
                  {/* 删除按钮 */}
                  {selectedPosition?.id === position.id && (
                    <button
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (position.id) {
                          onPositionDelete(position.id);
                        }
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 导出拖拽处理函数供父组件使用
export { SimplePDFViewer }; 