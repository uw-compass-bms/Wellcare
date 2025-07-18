/**
 * 坐标转换工具
 * 负责百分比坐标和像素坐标之间的相互转换
 */

import {
  PercentageCoordinates,
  PixelCoordinates,
  PageDimensions,
  DragEventData,
  CoordinateValidation
} from '@/lib/types/coordinates';

/**
 * 将拖拽事件转换为百分比坐标
 */
export function dragEventToPercentage(
  event: DragEventData,
  defaultSize: { width: number; height: number } = { width: 15, height: 8 }
): PercentageCoordinates {
  // 计算百分比位置
  const xPercent = (event.mouseX / event.containerWidth) * 100;
  const yPercent = (event.mouseY / event.containerHeight) * 100;
  
  // 确保位置在有效范围内
  const validX = Math.max(0, Math.min(100 - defaultSize.width, xPercent));
  const validY = Math.max(0, Math.min(100 - defaultSize.height, yPercent));
  
  return {
    x: validX,
    y: validY,
    width: defaultSize.width,
    height: defaultSize.height
  };
}

/**
 * 百分比坐标转像素坐标
 */
export function percentageToPixel(
  percentage: PercentageCoordinates,
  pageDimensions: PageDimensions
): PixelCoordinates {
  return {
    x: Math.round((percentage.x / 100) * pageDimensions.width),
    y: Math.round((percentage.y / 100) * pageDimensions.height),
    width: Math.round((percentage.width / 100) * pageDimensions.width),
    height: Math.round((percentage.height / 100) * pageDimensions.height)
  };
}

/**
 * 像素坐标转百分比坐标
 */
export function pixelToPercentage(
  pixel: PixelCoordinates,
  pageDimensions: PageDimensions
): PercentageCoordinates {
  return {
    x: (pixel.x / pageDimensions.width) * 100,
    y: (pixel.y / pageDimensions.height) * 100,
    width: (pixel.width / pageDimensions.width) * 100,
    height: (pixel.height / pageDimensions.height) * 100
  };
}

/**
 * 验证百分比坐标的有效性
 */
export function validatePercentageCoordinates(
  coordinates: PercentageCoordinates
): CoordinateValidation {
  const errors: string[] = [];
  
  // 检查坐标范围
  if (coordinates.x < 0 || coordinates.x > 100) {
    errors.push(`X坐标必须在0-100之间，当前值：${coordinates.x}`);
  }
  
  if (coordinates.y < 0 || coordinates.y > 100) {
    errors.push(`Y坐标必须在0-100之间，当前值：${coordinates.y}`);
  }
  
  if (coordinates.width <= 0 || coordinates.width > 100) {
    errors.push(`宽度必须在0-100之间，当前值：${coordinates.width}`);
  }
  
  if (coordinates.height <= 0 || coordinates.height > 100) {
    errors.push(`高度必须在0-100之间，当前值：${coordinates.height}`);
  }
  
  // 检查是否超出边界
  if (coordinates.x + coordinates.width > 100) {
    errors.push('签字位置超出右边界');
  }
  
  if (coordinates.y + coordinates.height > 100) {
    errors.push('签字位置超出下边界');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * 获取默认的组件尺寸（百分比）
 */
export function getDefaultWidgetSize(widgetType: string): { width: number; height: number } {
  const sizes: Record<string, { width: number; height: number }> = {
    signature: { width: 15, height: 8 },
    initials: { width: 10, height: 6 },
    date: { width: 12, height: 5 },
    text: { width: 20, height: 5 },
    checkbox: { width: 4, height: 4 },
    name: { width: 20, height: 5 },
    email: { width: 25, height: 5 },
    company: { width: 20, height: 5 },
    'job title': { width: 20, height: 5 },
    stamp: { width: 10, height: 10 }
  };
  
  return sizes[widgetType] || sizes.signature;
}

/**
 * 标准化百分比坐标（确保精度）
 */
export function normalizePercentageCoordinates(
  coordinates: PercentageCoordinates,
  precision: number = 2
): PercentageCoordinates {
  return {
    x: Number(coordinates.x.toFixed(precision)),
    y: Number(coordinates.y.toFixed(precision)),
    width: Number(coordinates.width.toFixed(precision)),
    height: Number(coordinates.height.toFixed(precision))
  };
}

/**
 * 计算两个位置的重叠百分比
 */
export function calculateOverlapPercentage(
  pos1: PercentageCoordinates,
  pos2: PercentageCoordinates
): number {
  const overlapLeft = Math.max(pos1.x, pos2.x);
  const overlapRight = Math.min(pos1.x + pos1.width, pos2.x + pos2.width);
  const overlapTop = Math.max(pos1.y, pos2.y);
  const overlapBottom = Math.min(pos1.y + pos1.height, pos2.y + pos2.height);
  
  if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
    const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
    const area1 = pos1.width * pos1.height;
    const area2 = pos2.width * pos2.height;
    const minArea = Math.min(area1, area2);
    
    return (overlapArea / minArea) * 100;
  }
  
  return 0;
}

/**
 * 获取PDF标准页面尺寸
 */
export function getStandardPageDimensions(format: string = 'A4'): PageDimensions {
  const formats: Record<string, PageDimensions> = {
    A4: { width: 595, height: 842 },
    Letter: { width: 612, height: 792 },
    Legal: { width: 612, height: 1008 },
    A3: { width: 842, height: 1191 }
  };
  
  return formats[format] || formats.A4;
}