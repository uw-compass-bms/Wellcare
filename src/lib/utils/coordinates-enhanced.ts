import { SignaturePosition as ComponentSignaturePosition, SignaturePositionData } from '@/lib/types/signature';
import { SignaturePosition as ApiSignaturePosition } from '@/lib/api/signature-positions';

/**
 * Enhanced coordinate system based on OpenSign implementation
 * Handles precise coordinate conversion with scaling and multi-page support
 */

export interface PDFDimensions {
  width: number;
  height: number;
}

export interface ContainerDimensions {
  width: number;
  height: number;
}

export interface NormalizedPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function convertDragToSignaturePosition(params: {
  type: string;
  x: number;
  y: number;
  containerScale: number;
  pageNumber: number;
  recipientId: string;
}): Omit<SignaturePositionData, 'key'> {
  const { type, x, y, containerScale, pageNumber, recipientId } = params;
  
  // 使用固定的页面尺寸 (A4: 595x842 points)
  const pageWidth = 595;
  const pageHeight = 842;
  
  // 计算实际容器尺寸
  const containerWidth = containerScale || 800; // 默认800px
  const containerHeight = (containerWidth * pageHeight) / pageWidth; // 保持A4比例
  
  // 计算百分比坐标 (0-100)
  const xPercent = (x / containerWidth) * 100;
  const yPercent = (y / containerHeight) * 100;
  
  // 默认尺寸百分比
  const widthPercent = 15; // 15% of page width
  const heightPercent = 8;  // 8% of page height
  
  // 计算像素尺寸
  const pixelWidth = (widthPercent / 100) * containerWidth;
  const pixelHeight = (heightPercent / 100) * containerHeight;
  
  // 验证坐标范围
  const validXPercent = Math.max(0, Math.min(100 - widthPercent, xPercent));
  const validYPercent = Math.max(0, Math.min(100 - heightPercent, yPercent));
  
  return {
    type,
    pageNumber,
    xPosition: (validXPercent / 100) * containerWidth,
    yPosition: (validYPercent / 100) * containerHeight,
    width: pixelWidth,
    height: pixelHeight,
    widthPercent: validXPercent,
    heightPercent: validYPercent,
    pageWidth: containerWidth,
    pageHeight: containerHeight,
    recipientId,
    scale: 1,
    zIndex: Date.now(),
    options: {
      fontSize: 12,
      fontColor: 'black',
      placeholder: getPlaceholderText(type)
    }
  };
}

export function normalizedToPixelPosition(
  position: SignaturePositionData,
  containerDimensions: ContainerDimensions
): NormalizedPosition {
  return {
    x: (position.xPosition / position.pageWidth) * containerDimensions.width,
    y: (position.yPosition / position.pageHeight) * containerDimensions.height,
    width: (position.width / position.pageWidth) * containerDimensions.width,
    height: (position.height / position.pageHeight) * containerDimensions.height
  };
}

export function getContainerScale(
  pdfDimensions: PDFDimensions[],
  pageNumber: number,
  containerDimensions: ContainerDimensions
): number {
  const pageDimensions = pdfDimensions[pageNumber - 1] || { width: 595, height: 842 }; // A4 default
  return containerDimensions.width / pageDimensions.width;
}

export function updatePositionAfterDrag(
  position: SignaturePositionData,
  newPixelPosition: { x: number; y: number },
  containerScale: number
): SignaturePositionData {
  const updatedPosition = { ...position };
  
  updatedPosition.xPosition = (newPixelPosition.x / containerScale) * position.pageWidth;
  updatedPosition.yPosition = (newPixelPosition.y / containerScale) * position.pageHeight;
  
  return updatedPosition;
}

/**
 * Generate unique key for position identification
 */
export function generateUniqueKey(): string {
  return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get placeholder text based on widget type
 */
export function getPlaceholderText(type: string): string {
  const placeholders = {
    signature: 'Click to sign',
    date: 'Date',
    text: 'Text field',
    initials: 'Initials',
    name: 'Name',
    email: 'Email',
    company: 'Company',
    'job title': 'Job Title',
    checkbox: 'Checkbox',
    stamp: 'Stamp'
  };

  return placeholders[type as keyof typeof placeholders] || 'Click here';
}

/**
 * Check if positions overlap (for conflict detection)
 */
export function checkPositionOverlap(
  pos1: SignaturePositionData,
  pos2: SignaturePositionData,
  threshold: number = 0.2
): boolean {
  if (pos1.pageNumber !== pos2.pageNumber) return false;

  const overlapLeft = Math.max(pos1.xPosition, pos2.xPosition);
  const overlapRight = Math.min(
    pos1.xPosition + pos1.width,
    pos2.xPosition + pos2.width
  );
  const overlapTop = Math.max(pos1.yPosition, pos2.yPosition);
  const overlapBottom = Math.min(
    pos1.yPosition + pos1.height,
    pos2.yPosition + pos2.height
  );

  if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
    const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
    const area1 = pos1.width * pos1.height;
    const area2 = pos2.width * pos2.height;
    
    return overlapArea > Math.min(area1, area2) * threshold;
  }

  return false;
}

/**
 * Validate position bounds within PDF page
 */
export function validatePositionBounds(
  position: SignaturePositionData,
  pdfDimensions: PDFDimensions
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (position.xPosition < 0) {
    errors.push('Position X cannot be negative');
  }
  
  if (position.yPosition < 0) {
    errors.push('Position Y cannot be negative');
  }
  
  if (position.xPosition + position.width > pdfDimensions.width) {
    errors.push('Position extends beyond page width');
  }
  
  if (position.yPosition + position.height > pdfDimensions.height) {
    errors.push('Position extends beyond page height');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
} 

// 导出签名组件类型
export type WidgetType = 'signature' | 'date' | 'text' | 'checkbox' | 'initials' | 'name' | 'email' | 'company' | 'job title' | 'stamp'; 

// 将API类型转换为组件类型
export function convertToComponentPosition(position: ApiSignaturePosition): SignaturePositionData {
  // 假设页面尺寸 (A4: 595x842 points)
  const pageWidth = 595;
  const pageHeight = 842;
  
  // 计算百分比坐标
  const widthPercent = (position.width / pageWidth) * 100;
  const heightPercent = (position.height / pageHeight) * 100;
  
  return {
    key: position.id || generateUniqueKey(),
    type: 'signature',
    xPosition: position.x,
    yPosition: position.y,
    width: position.width,
    height: position.height,
    pageNumber: position.pageNumber,
    recipientId: position.recipientId,
    widthPercent: widthPercent,
    heightPercent: heightPercent,
    pageWidth: pageWidth,
    pageHeight: pageHeight,
    scale: 1,
    zIndex: Date.now(),
    options: {
      fontSize: 12,
      fontColor: 'black',
      placeholder: position.placeholderText || getPlaceholderText('signature')
    }
  };
}

// 将组件类型转换为API类型
export function convertToApiPosition(position: Omit<SignaturePositionData, 'key'>): Omit<ApiSignaturePosition, 'id'> {
  return {
    fileId: '', // 需要在使用时填充
    x: position.xPosition,
    y: position.yPosition,
    width: position.width,
    height: position.height,
    pageNumber: position.pageNumber,
    recipientId: position.recipientId || ''
  };
}

// 批量转换函数
export function convertToComponentPositions(positions: ApiSignaturePosition[]): SignaturePositionData[] {
  return positions.map(convertToComponentPosition);
} 

export function isOverlapping(pos1: SignaturePositionData, pos2: SignaturePositionData): boolean {
  // 检查两个位置是否在同一页
  if (pos1.pageNumber !== pos2.pageNumber) {
    return false;
  }

  // 获取位置的边界
  const pos1Left = pos1.xPosition;
  const pos1Right = pos1.xPosition + pos1.width;
  const pos1Top = pos1.yPosition;
  const pos1Bottom = pos1.yPosition + pos1.height;

  const pos2Left = pos2.xPosition;
  const pos2Right = pos2.xPosition + pos2.width;
  const pos2Top = pos2.yPosition;
  const pos2Bottom = pos2.yPosition + pos2.height;

  // 检查是否重叠
  return !(
    pos1Right < pos2Left ||
    pos1Left > pos2Right ||
    pos1Bottom < pos2Top ||
    pos1Top > pos2Bottom
  );
} 