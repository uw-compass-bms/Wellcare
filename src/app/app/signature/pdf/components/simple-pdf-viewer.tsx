'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  convertDragToSignaturePosition,
  generateUniqueKey,
  getPlaceholderText
} from '@/lib/utils/coordinates-enhanced';
import { 
  FileInfo, 
  RecipientInfo, 
  SignaturePositionData 
} from '@/lib/types/signature';
import PDFPagination from './pdf-pagination';
import SignaturePosition from './signature-position';

export interface SimplePDFViewerProps {
  files: FileInfo[];
  recipients: RecipientInfo[];
  currentFileId: string;
  currentPageNumber: number;
  positions: SignaturePositionData[];
  selectedPosition: SignaturePositionData | null;
  selectedRecipientId: string;
  onPositionSelect: (position: SignaturePositionData | null) => void;
  onPositionUpdate: (position: SignaturePositionData) => void;
  onPositionDelete: (positionId: string) => void;
  onPositionAdd: (position: Omit<SignaturePositionData, 'key'>) => void;
  onPageChange: (pageNumber: number) => void;
  onDragEnd?: () => void;
  draggedWidgetType?: string | null;
}

const SimplePDFViewer: React.FC<SimplePDFViewerProps> = ({
  files,
  recipients,
  currentFileId,
  currentPageNumber,
  positions,
  selectedPosition,
  selectedRecipientId,
  onPositionSelect,
  onPositionUpdate,
  onPositionDelete,
  onPositionAdd,
  onPageChange,
  onDragEnd,
  draggedWidgetType
}) => {
  const [totalPages, setTotalPages] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<HTMLEmbedElement>(null);

  const currentFile = files.find(f => f.id === currentFileId);
  const currentPagePositions = positions.filter(p => p.pageNumber === currentPageNumber);

  // 简化的PDF页面计数 - 暂时使用固定值避免解析错误
  useEffect(() => {
    if (currentFile?.supabaseUrl) {
      // 暂时设置为默认值，避免PDF解析错误
      setTotalPages(5); // 可以根据实际需要调整
      console.log('Using default page count to avoid PDF parsing errors');
    }
  }, [currentFile?.supabaseUrl]);

  // 确保PDF容器有正确的宽高比
  useEffect(() => {
    const updateAspectRatio = () => {
      if (pdfContainerRef.current) {
        const width = pdfContainerRef.current.offsetWidth;
        // A4 比例: 1:1.414
        const height = width * 1.414;
        pdfContainerRef.current.style.height = `${height}px`;
      }
    };

    updateAspectRatio();
    window.addEventListener('resize', updateAspectRatio);
    return () => window.removeEventListener('resize', updateAspectRatio);
  }, [currentFile]);

  // 处理拖拽悬停
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    
    console.log('[PDFViewer] handleDragOver, draggedWidgetType:', draggedWidgetType);
    
    // 只有在实际拖拽时才显示覆盖层
    if (!isDragOver) {
      console.log('[PDFViewer] Setting isDragOver to true');
      setIsDragOver(true);
    }
  };

  // 处理拖拽离开
  const handleDragLeave = (event: React.DragEvent) => {
    // 检查是否真的离开了PDF容器
    const rect = pdfContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = event;
      if (clientX < rect.left || clientX > rect.right || 
          clientY < rect.top || clientY > rect.bottom) {
        setIsDragOver(false);
      }
    }
  };

  // 处理拖拽放置
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    console.log('Drop event triggered');
    setIsDragOver(false);

    const droppedType = event.dataTransfer.getData('text/plain');
    console.log('Dropped type:', droppedType);
    
    if (!droppedType || !pdfContainerRef.current || !selectedRecipientId) {
      console.warn('Drop failed: missing data', { 
        droppedType, 
        hasPdfContainer: !!pdfContainerRef.current,
        selectedRecipientId 
      });
      onDragEnd?.(); // 即使失败也要清除拖拽状态
      return;
    }

    const containerRect = pdfContainerRef.current.getBoundingClientRect();
    const dropX = event.clientX - containerRect.left;
    const dropY = event.clientY - containerRect.top;

    console.log('Drop details:', { 
      mouseX: event.clientX,
      mouseY: event.clientY,
      containerLeft: containerRect.left,
      containerTop: containerRect.top,
      dropX, 
      dropY, 
      containerWidth: containerRect.width,
      containerHeight: containerRect.height
    });

    try {
      const newPosition = convertDragToSignaturePosition({
        type: droppedType,
        x: dropX,
        y: dropY,
        containerScale: containerRect.width,
        pageNumber: currentPageNumber,
        recipientId: selectedRecipientId
      });

      console.log('Generated position:', newPosition);
      onPositionAdd(newPosition);
      onDragEnd?.(); // 成功后清除拖拽状态
    } catch (error) {
      console.error('Failed to create position:', error);
      alert('Failed to create signature position, please try again');
      onDragEnd?.(); // 错误后也要清除拖拽状态
    }
  };

  // 处理位置点击选择
  const handlePositionClick = (position: SignaturePositionData) => {
    onPositionSelect(position);
  };

  // 处理位置删除
  const handleDeleteClick = (positionKey: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onPositionDelete(positionKey);
    onPositionSelect(null);
  };

  if (!currentFile) {
    return (
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium mb-2">No File Selected</h3>
          <p className="text-sm">Please select a PDF file to view</p>
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
          <p className="text-sm">PDF file URL is missing or invalid</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-100 flex flex-col">
      {/* 文件信息头部 */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h3 className="font-medium text-gray-900">
              {currentFile.displayName || currentFile.originalFilename}
            </h3>
            <p className="text-sm text-gray-600">
              Page {currentPageNumber} of {totalPages}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {currentPagePositions.length} signature position(s) on this page
          </div>
        </div>
      </div>

      {/* PDF显示区域 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto py-8">
          <div 
            className={`bg-white rounded-lg shadow-sm overflow-hidden transition-all relative ${
              isDragOver ? 'ring-4 ring-blue-300 ring-opacity-50 shadow-lg scale-[1.02]' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* 拖拽提示覆盖层 */}
            {isDragOver && draggedWidgetType && (
              <div className="absolute inset-0 bg-blue-50 bg-opacity-30 border-2 border-dashed border-blue-400 z-10 pointer-events-none">
              </div>
            )}

            <div 
              ref={pdfContainerRef}
              data-pdf-container
              className="relative"
              style={{ 
                minHeight: '800px',
                aspectRatio: '1/1.414' // A4 比例
              }}
            >
              {/* PDF内容 */}
              <embed
                ref={embedRef}
                src={`${currentFile.supabaseUrl}#page=${currentPageNumber}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                type="application/pdf"
                className="w-full h-full min-h-[800px]"
                style={{ pointerEvents: 'none' }}
                title={currentFile.displayName || currentFile.originalFilename}
              />

              {/* 拖拽接收层 - 已移到外层容器处理 */}

              {/* 签名位置覆盖层 - 使用百分比定位 */}
              <div className="absolute inset-0" style={{ pointerEvents: 'none', zIndex: 2 }}>
                {currentPagePositions.map(position => (
                  <SignaturePosition
                    key={position.key}
                    position={position}
                    isSelected={selectedPosition?.key === position.key}
                    onClick={() => handlePositionClick(position)}
                    onDelete={handleDeleteClick}
                    recipients={recipients}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 分页控件 */}
          <PDFPagination
            currentPage={currentPageNumber}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default SimplePDFViewer;