/**
 * PDF坐标转换器
 * 负责在百分比坐标和PDF像素坐标之间转换
 */

import { SignatureElement, PDFPageInfo } from './pdf-types';
import { SignatureRenderInstruction } from './signature-renderer';

/**
 * 将签字元素转换为渲染指令
 * 百分比坐标 -> PDF像素坐标
 */
export function transformElementToInstruction(
  element: SignatureElement,
  pageInfo: PDFPageInfo
): SignatureRenderInstruction {
  // PDF坐标系：原点在左下角
  // 百分比坐标：原点在左上角
  // 需要进行Y轴翻转
  
  const pixelX = (element.position.x / 100) * pageInfo.width;
  const pixelY = pageInfo.height - ((element.position.y / 100) * pageInfo.height);
  
  // 计算文本尺寸（基于字体大小的估算）
  const estimatedWidth = (element.position.width / 100) * pageInfo.width;
  const estimatedHeight = (element.position.height / 100) * pageInfo.height;
  
  return {
    elementId: element.id,
    pageIndex: element.pageIndex,
    position: {
      x: Math.round(pixelX),
      y: Math.round(pixelY) // PDF坐标系中Y轴向上
    },
    content: element.content,
    style: {
      fontSize: element.style.fontSize,
      fontColor: element.style.fontColor,
      fontFamily: element.style.fontFamily
    },
    // 添加边界信息供验证使用
    bounds: {
      left: pixelX,
      right: pixelX + estimatedWidth,
      top: pixelY,
      bottom: pixelY - estimatedHeight // PDF坐标系中向下是负方向
    }
  };
}

/**
 * 批量转换签字元素
 */
export function transformElementsToInstructions(
  elements: SignatureElement[],
  pageInfos: PDFPageInfo[]
): SignatureRenderInstruction[] {
  return elements.map(element => {
    const pageInfo = pageInfos[element.pageIndex];
    if (!pageInfo) {
      throw new Error(`Page ${element.pageIndex} not found in PDF`);
    }
    return transformElementToInstruction(element, pageInfo);
  });
}

/**
 * 从数据库记录创建签字元素
 * 数据库存储百分比坐标，直接使用
 */
export function createSignatureElementFromDB(dbRecord: any): SignatureElement {
  return {
    id: dbRecord.id,
    type: 'text' as any, // 简化类型
    content: dbRecord.signature_content || dbRecord.placeholder_text || 'Signature',
    position: {
      x: dbRecord.x_percent,
      y: dbRecord.y_percent,
      width: dbRecord.width_percent,
      height: dbRecord.height_percent
    },
    pageIndex: dbRecord.page_number - 1, // 数据库页码从1开始，PDF从0开始
    style: {
      fontSize: 12,
      fontColor: '#000000',
      fontFamily: 'Helvetica'
    },
    recipientId: dbRecord.recipient_id
  };
}

/**
 * 验证坐标是否在页面范围内
 */
export function validateCoordinates(
  element: SignatureElement,
  pageInfo: PDFPageInfo
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 验证百分比范围
  if (element.position.x < 0 || element.position.x > 100) {
    errors.push(`X坐标超出范围: ${element.position.x}%`);
  }
  
  if (element.position.y < 0 || element.position.y > 100) {
    errors.push(`Y坐标超出范围: ${element.position.y}%`);
  }
  
  if (element.position.x + element.position.width > 100) {
    errors.push(`签字区域超出右边界`);
  }
  
  if (element.position.y + element.position.height > 100) {
    errors.push(`签字区域超出下边界`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 调试输出坐标转换信息
 */
export function debugCoordinateTransform(
  element: SignatureElement,
  pageInfo: PDFPageInfo,
  instruction: SignatureRenderInstruction
): void {
  console.log('坐标转换调试信息:');
  console.log('输入元素:', {
    id: element.id,
    position: element.position,
    pageIndex: element.pageIndex
  });
  console.log('页面信息:', {
    width: pageInfo.width,
    height: pageInfo.height,
    pageIndex: pageInfo.pageIndex
  });
  console.log('输出指令:', {
    position: instruction.position,
    bounds: instruction.bounds
  });
  console.log('转换计算:');
  console.log(`  X: ${element.position.x}% × ${pageInfo.width}px = ${instruction.position.x}px`);
  console.log(`  Y: ${element.position.y}% × ${pageInfo.height}px, 翻转后 = ${instruction.position.y}px`);
}