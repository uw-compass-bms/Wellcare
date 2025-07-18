/**
 * 坐标转换工具函数
 * 统一使用百分比坐标系统 (0-100)
 */

export interface PercentageCoordinates {
  x: number;      // 0-100
  y: number;      // 0-100
  width: number;  // 0-100
  height: number; // 0-100
}

export interface PixelCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 将像素坐标转换为百分比坐标
 */
export function pixelsToPercentage(
  pixels: PixelCoordinates,
  containerWidth: number,
  containerHeight: number
): PercentageCoordinates {
  return {
    x: (pixels.x / containerWidth) * 100,
    y: (pixels.y / containerHeight) * 100,
    width: (pixels.width / containerWidth) * 100,
    height: (pixels.height / containerHeight) * 100,
  };
}

/**
 * 将百分比坐标转换为像素坐标
 */
export function percentageToPixels(
  percentage: PercentageCoordinates,
  containerWidth: number,
  containerHeight: number
): PixelCoordinates {
  return {
    x: (percentage.x / 100) * containerWidth,
    y: (percentage.y / 100) * containerHeight,
    width: (percentage.width / 100) * containerWidth,
    height: (percentage.height / 100) * containerHeight,
  };
}

/**
 * 从鼠标事件计算百分比坐标
 */
export function getPercentageFromMouseEvent(
  event: React.MouseEvent,
  container: HTMLElement
): { x: number; y: number } {
  const rect = container.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  
  // 确保坐标在有效范围内
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

/**
 * 限制坐标在容器范围内
 */
export function clampCoordinates(
  coords: PercentageCoordinates
): PercentageCoordinates {
  return {
    x: Math.max(0, Math.min(100 - coords.width, coords.x)),
    y: Math.max(0, Math.min(100 - coords.height, coords.y)),
    width: Math.max(0, Math.min(100 - coords.x, coords.width)),
    height: Math.max(0, Math.min(100 - coords.y, coords.height)),
  };
}

/**
 * 获取元素的页面信息
 */
export function getPageInfo(element: HTMLElement): {
  pageNumber: number;
  width: number;
  height: number;
} | null {
  const pageElement = element.closest('[data-page-number]');
  if (!pageElement) return null;
  
  const pageNumber = parseInt(pageElement.getAttribute('data-page-number') || '0');
  const rect = pageElement.getBoundingClientRect();
  
  return {
    pageNumber,
    width: rect.width,
    height: rect.height,
  };
}