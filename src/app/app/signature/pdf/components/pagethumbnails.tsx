 'use client';

import React from 'react';

interface SignaturePosition {
  id: string;
  pageNumber: number;
  type: string;
}

interface PageThumbnailsProps {
  currentPage: number;
  totalPages: number;
  signaturePositions: SignaturePosition[];
  onPageChange: (page: number) => void;
}

const PageThumbnails: React.FC<PageThumbnailsProps> = ({
  currentPage,
  totalPages,
  signaturePositions,
  onPageChange
}) => {
  // Calculate signature position count for each page
  const getPositionCountForPage = (pageNumber: number) => {
    return signaturePositions.filter(pos => pos.pageNumber === pageNumber).length;
  };

  return (
    <div className="h-32 bg-white border-t border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">Page Navigation</h3>
        <div className="text-xs text-gray-500">
          Page {currentPage} of {totalPages}
        </div>
      </div>
      
      <div className="flex space-x-3 overflow-x-auto">
        {Array.from({ length: totalPages }, (_, index) => {
          const pageNumber = index + 1;
          const positionCount = getPositionCountForPage(pageNumber);
          const isActive = pageNumber === currentPage;
          
          return (
            <div
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              className={`
                relative flex-shrink-0 w-16 h-20 border-2 rounded cursor-pointer transition-all
                ${isActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }
              `}
            >
              {/* Thumbnail placeholder area */}
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="text-xs text-gray-400 mb-1">📄</div>
                <div className={`text-xs font-medium ${isActive ? 'text-blue-700' : 'text-gray-600'}`}>
                  {pageNumber}
                </div>
              </div>
              
              {/* Signature position counter */}
              {positionCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {positionCount}
                </div>
              )}
            </div>
          );
        })}
        
        {/* If no pages, show placeholder */}
        {totalPages === 0 && (
          <div className="text-sm text-gray-500 text-center py-4 w-full">
            No PDF pages
          </div>
        )}
      </div>
    </div>
  );
};

export default PageThumbnails;