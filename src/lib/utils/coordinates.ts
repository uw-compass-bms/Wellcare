/**
 * 前端坐标转换工具
 * 处理PDF查看器中的坐标转换
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Point, Size {}

export interface PDFDimensions {
  width: number;
  height: number;
}

/**
 * 将像素坐标转换为百分比坐标
 */
export function pixelsToPercentage(
  pixelRect: Rect,
  containerDimensions: PDFDimensions
): Rect {
  return {
    x: (pixelRect.x / containerDimensions.width) * 100,
    y: (pixelRect.y / containerDimensions.height) * 100,
    width: (pixelRect.width / containerDimensions.width) * 100,
    height: (pixelRect.height / containerDimensions.height) * 100
  };
}

/**
 * 将百分比坐标转换为像素坐标
 */
export function percentageToPixels(
  percentageRect: Rect,
  containerDimensions: PDFDimensions
): Rect {
  return {
    x: (percentageRect.x / 100) * containerDimensions.width,
    y: (percentageRect.y / 100) * containerDimensions.height,
    width: (percentageRect.width / 100) * containerDimensions.width,
    height: (percentageRect.height / 100) * containerDimensions.height
  };
}

/**
 * 获取PDF容器的实际尺寸
 */
export function getPDFContainerDimensions(containerElement: HTMLElement): PDFDimensions {
  const rect = containerElement.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height
  };
}

/**
 * 将鼠标事件坐标转换为相对于容器的坐标
 */
export function getRelativeCoordinates(
  event: MouseEvent | React.MouseEvent,
  containerElement: HTMLElement
): Point {
  const rect = containerElement.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

/**
 * 确保坐标在有效范围内（0-100%）
 */
export function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * 确保矩形在容器范围内
 */
export function clampRectToContainer(
  rect: Rect,
  containerDimensions: PDFDimensions
): Rect {
  const maxX = containerDimensions.width - rect.width;
  const maxY = containerDimensions.height - rect.height;
  
  return {
    x: Math.max(0, Math.min(rect.x, maxX)),
    y: Math.max(0, Math.min(rect.y, maxY)),
    width: rect.width,
    height: rect.height
  };
}

/**
 * 确保百分比矩形在有效范围内
 */
export function clampPercentageRect(rect: Rect): Rect {
  const maxX = 100 - rect.width;
  const maxY = 100 - rect.height;
  
  return {
    x: clampPercentage(Math.min(rect.x, maxX)),
    y: clampPercentage(Math.min(rect.y, maxY)),
    width: clampPercentage(rect.width),
    height: clampPercentage(rect.height)
  };
}

/**
 * 计算合适的签名框尺寸（根据容器大小自动调整）
 */
export function calculateSignatureBoxSize(
  containerDimensions: PDFDimensions,
  type: 'signature' | 'date' | 'text' = 'signature'
): Size {
  const baseWidth = containerDimensions.width * 0.15; // 容器宽度的15%
  const baseHeight = containerDimensions.height * 0.05; // 容器高度的5%
  
  switch (type) {
    case 'signature':
      return {
        width: Math.max(120, baseWidth),
        height: Math.max(40, baseHeight)
      };
    case 'date':
      return {
        width: Math.max(100, baseWidth * 0.8),
        height: Math.max(30, baseHeight * 0.8)
      };
    case 'text':
      return {
        width: Math.max(150, baseWidth * 1.2),
        height: Math.max(35, baseHeight * 0.9)
      };
    default:
      return {
        width: Math.max(120, baseWidth),
        height: Math.max(40, baseHeight)
      };
  }
}

/**
 * 将拖拽事件转换为签名位置数据
 */
export function convertDragEventToPosition(
  event: React.DragEvent,
  containerElement: HTMLElement,
  itemType: string,
  fileId: string,
  pageNumber: number
): {
  pixelPosition: Rect;
  percentagePosition: Rect;
  containerDimensions: PDFDimensions;
} {
  const containerDimensions = getPDFContainerDimensions(containerElement);
  const relativeCoords = getRelativeCoordinates(event, containerElement);
  const signatureSize = calculateSignatureBoxSize(containerDimensions, itemType as any);
  
  // 计算位置（居中放置在鼠标位置）
  const pixelPosition: Rect = {
    x: relativeCoords.x - signatureSize.width / 2,
    y: relativeCoords.y - signatureSize.height / 2,
    width: signatureSize.width,
    height: signatureSize.height
  };
  
  // 确保在容器范围内
  const clampedPixelPosition = clampRectToContainer(pixelPosition, containerDimensions);
  
  // 转换为百分比坐标
  const percentagePosition = pixelsToPercentage(clampedPixelPosition, containerDimensions);
  
  return {
    pixelPosition: clampedPixelPosition,
    percentagePosition: clampPercentageRect(percentagePosition),
    containerDimensions
  };
} 