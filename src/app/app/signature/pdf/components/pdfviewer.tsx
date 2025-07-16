'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 确保只在客户端设置PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

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

interface PDFViewerProps {
  files: FileInfo[];
  currentFileId: string;
  currentPageNumber: number;
  positions: SignaturePosition[];
  selectedPosition: SignaturePosition | null;
  onPositionSelect: (position: SignaturePosition | null) => void;
  onPositionUpdate: (position: SignaturePosition) => void;
  onPositionDelete: (positionId: string) => void;
}

export default function PDFViewer({
  files,
  currentFileId,
  currentPageNumber,
  positions,
  selectedPosition,
  onPositionSelect,
  onPositionUpdate,
  onPositionDelete
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const currentFile = files.find(f => f.id === currentFileId);
  const currentPagePositions = positions.filter(
    p => p.fileId === currentFileId && p.pageNumber === currentPageNumber
  );

  // 调试日志
  console.log('PDFViewer - Current file:', currentFile);
  console.log('PDFViewer - File URL:', currentFile?.supabaseUrl);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully, pages:', numPages);
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
    setError(`无法加载PDF文件: ${error.message}`);
    setLoading(false);
  }, []);

  const onPageLoadSuccess = useCallback((page: any) => {
    setPageWidth(page.width);
  }, []);

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
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="text-center text-red-500">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-lg font-medium mb-2">Error Loading PDF</h3>
          <p className="text-sm">{error}</p>
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
                Page {currentPageNumber} of {numPages}
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {currentPagePositions.length} signature position(s) on this page
            </div>
          </div>
        </div>

        {/* PDF 显示区域 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="relative">
            <Document
              file={currentFile.supabaseUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
              }
            >
              <Page
                pageNumber={currentPageNumber}
                onLoadSuccess={onPageLoadSuccess}
                scale={1.2}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                  </div>
                }
              />
            </Document>

            {/* 渲染签名位置框 */}
            {currentPagePositions.map((position) => (
              <div
                key={position.id || `${position.x}-${position.y}`}
                className={`absolute border-2 bg-blue-50 bg-opacity-70 cursor-pointer transition-all ${
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
  );
} 