'use client';

import React, { useState } from 'react';

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
}

export default function SimplePDFViewer({
  files,
  currentFileId,
  currentPageNumber,
  positions,
  selectedPosition,
  onPositionSelect,
  onPositionUpdate,
  onPositionDelete
}: SimplePDFViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const currentFile = files.find(f => f.id === currentFileId);
  const currentPagePositions = positions.filter(
    p => p.fileId === currentFileId && p.pageNumber === currentPageNumber
  );

  // 调试日志
  console.log('SimplePDFViewer - Current file:', currentFile);
  console.log('SimplePDFViewer - File URL:', currentFile?.supabaseUrl);

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

        {/* PDF 显示区域 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="relative min-h-[800px]">
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

            {/* 加载状态 */}
            {loading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading PDF...</p>
                </div>
              </div>
            )}

            {/* 错误状态 */}
            {error && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                <div className="text-center text-red-500">
                  <div className="text-6xl mb-4">❌</div>
                  <h3 className="text-lg font-medium mb-2">Error Loading PDF</h3>
                  <p className="text-sm">{error}</p>
                  <p className="text-xs mt-2 text-gray-500">URL: {currentFile.supabaseUrl}</p>
                </div>
              </div>
            )}

            {/* 渲染签名位置框 - 暂时放在PDF上层 */}
            <div className="absolute inset-0 pointer-events-none">
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