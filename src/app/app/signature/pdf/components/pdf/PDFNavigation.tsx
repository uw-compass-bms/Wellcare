'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PDFNavigationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

const PDFNavigation: React.FC<PDFNavigationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = ''
}) => {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // 调整开始页面以显示足够的页码
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // 第一页
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="dots1" className="px-2 text-gray-400">
            ...
          </span>
        );
      }
    }

    // 中间页码
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 text-sm border rounded transition-colors ${
            i === currentPage
              ? 'bg-blue-600 text-white border-blue-600'
              : 'hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      );
    }

    // 最后一页
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="dots2" className="px-2 text-gray-400">
            ...
          </span>
        );
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      {/* 第一页 */}
      <button
        onClick={() => handlePageChange(1)}
        disabled={!canGoPrevious}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="First page"
      >
        <ChevronsLeft size={16} />
      </button>

      {/* 上一页 */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={!canGoPrevious}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {/* 页码 */}
      <div className="flex items-center space-x-1">
        {renderPageNumbers()}
      </div>

      {/* 下一页 */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={!canGoNext}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Next page"
      >
        <ChevronRight size={16} />
      </button>

      {/* 最后一页 */}
      <button
        onClick={() => handlePageChange(totalPages)}
        disabled={!canGoNext}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Last page"
      >
        <ChevronsRight size={16} />
      </button>

      {/* 页面信息 */}
      <div className="ml-4 text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
};

export default PDFNavigation;