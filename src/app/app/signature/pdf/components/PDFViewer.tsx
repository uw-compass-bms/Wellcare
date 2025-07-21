'use client';

import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 设置PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

interface PDFViewerProps {
  fileUrl: string;
  onPageClick?: (event: React.MouseEvent, pageNumber: number) => void;
  onDocumentLoad?: (numPages: number) => void;
  scale?: number;
  className?: string;
  children?: React.ReactNode;
}

/**
 * 纯PDF渲染组件，参考Documenso最佳实践
 * 只负责PDF显示，不处理任何拖拽逻辑
 */
export const PDFViewer: React.FC<PDFViewerProps> = ({
  fileUrl,
  onPageClick,
  onDocumentLoad,
  scale = 1,
  className = '',
  children
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
    onDocumentLoad?.(numPages);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('Failed to load PDF file');
    setLoading(false);
  };

  const handlePageClick = (event: React.MouseEvent, pageNum: number) => {
    if (onPageClick) {
      event.preventDefault();
      event.stopPropagation();
      onPageClick(event, pageNum);
    }
  };

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-2">No PDF file specified</p>
          <p className="text-sm text-gray-500">Please ensure a PDF file is attached to this task</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <p className="text-sm text-gray-500">File URL: {fileUrl}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`pdf-viewer ${className}`} ref={containerRef}>
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, index) => (
          <div
            key={`page_${index + 1}`}
            className="pdf-page-container relative mb-4 mx-auto"
            data-page-number={index + 1}
            style={{ width: 'fit-content' }}
          >
            <Page
              pageNumber={index + 1}
              width={containerWidth > 0 ? Math.min(containerWidth - 32, 800) : undefined}
              scale={containerWidth > 0 ? undefined : scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onClick={(event) => handlePageClick(event, index + 1)}
              className="pdf-page shadow-lg mx-auto"
            />
            {/* 字段渲染层 - 通过children传入 */}
            {children}
          </div>
        ))}
      </Document>
    </div>
  );
};