/**
 * PDF基础操作模块
 * 负责页面复制、文档准备、坐标转换等基础PDF操作
 */

import { PDFDocument, PDFFont, StandardFonts } from 'pdf-lib';
import { PDFDocumentInfo, PDFProcessorError, PDFErrorCode, SignatureElement, CoordinateTransform } from './pdf-types';

export class PDFOperations {
  /**
   * 创建新的PDF文档副本
   */
  async createDocumentCopy(originalDoc: PDFDocument): Promise<PDFDocument> {
    try {
      // 创建新文档
      const newDoc = await PDFDocument.create();
      
      // 复制所有页面
      const pageIndices = originalDoc.getPageIndices();
      const copiedPages = await newDoc.copyPages(originalDoc, pageIndices);
      
      // 添加页面到新文档
      copiedPages.forEach(page => newDoc.addPage(page));
      
      // 复制文档元数据
      this.copyDocumentMetadata(originalDoc, newDoc);
      
      return newDoc;
    } catch (error) {
      throw this.createOperationError(error, 'Failed to create document copy');
    }
  }

  /**
   * 准备文档用于签字添加（确保字体等资源可用）
   */
  async prepareDocumentForSigning(pdfDoc: PDFDocument): Promise<PreparedDocument> {
    try {
      // 嵌入标准字体
      const fonts = await this.embedStandardFonts(pdfDoc);
      
      // 创建坐标转换器
      const coordinateTransform = this.createCoordinateTransform(pdfDoc);
      
      return {
        document: pdfDoc,
        fonts,
        coordinateTransform
      };
    } catch (error) {
      throw this.createOperationError(error, 'Failed to prepare document for signing');
    }
  }

  /**
   * 嵌入标准字体到PDF文档
   */
  private async embedStandardFonts(pdfDoc: PDFDocument): Promise<DocumentFonts> {
    try {
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

      return {
        helvetica,
        helveticaBold,
        timesRoman,
        timesRomanBold,
        default: helvetica
      };
    } catch (error) {
      throw new Error(`Failed to embed fonts: ${error}`);
    }
  }

  /**
   * 创建坐标转换器
   */
  createCoordinateTransform(pdfDoc: PDFDocument): CoordinateTransform {
    const pages = pdfDoc.getPages();

    return {
      fromPercent: (percentX: number, percentY: number, pageIndex: number) => {
        const page = pages[pageIndex];
        if (!page) {
          throw new Error(`Invalid page index: ${pageIndex}`);
        }

        const { width, height } = page.getSize();
        
        // 转换百分比坐标到像素坐标
        // 注意：PDF坐标系原点在左下角，而我们的百分比坐标原点在左上角
        const x = (percentX / 100) * width;
        const y = height - (percentY / 100) * height;
        
        return { x, y };
      },

      toPercent: (pixelX: number, pixelY: number, pageIndex: number) => {
        const page = pages[pageIndex];
        if (!page) {
          throw new Error(`Invalid page index: ${pageIndex}`);
        }

        const { width, height } = page.getSize();
        
        // 转换像素坐标到百分比坐标
        const x = (pixelX / width) * 100;
        const y = ((height - pixelY) / height) * 100;
        
        return { x, y };
      },

      getPageDimensions: (pageIndex: number) => {
        const page = pages[pageIndex];
        if (!page) {
          throw new Error(`Invalid page index: ${pageIndex}`);
        }
        
        return page.getSize();
      }
    };
  }

  /**
   * 验证签字元素是否可以放置在指定位置
   */
  validateElementPlacement(
    element: SignatureElement, 
    documentInfo: PDFDocumentInfo
  ): ElementValidationResult {
    const result: ElementValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 检查页面索引
    if (element.pageIndex < 0 || element.pageIndex >= documentInfo.pageCount) {
      result.isValid = false;
      result.errors.push(`Invalid page index: ${element.pageIndex}`);
    }

    // 检查坐标范围
    const { x, y, width, height } = element.position;
    if (x < 0 || x > 100 || y < 0 || y > 100) {
      result.isValid = false;
      result.errors.push('Position coordinates must be between 0 and 100');
    }

    if (width <= 0 || height <= 0) {
      result.isValid = false;
      result.errors.push('Width and height must be positive');
    }

    if (x + width > 100 || y + height > 100) {
      result.isValid = false;
      result.errors.push('Element extends beyond page boundaries');
    }

    // 检查元素大小是否合理
    if (width < 5 || height < 2) {
      result.warnings.push('Element might be too small to be clearly visible');
    }

    if (width > 50 || height > 30) {
      result.warnings.push('Element might be too large');
    }

    return result;
  }

  /**
   * 检查多个元素之间的冲突
   */
  checkElementConflicts(elements: SignatureElement[]): ConflictCheckResult {
    const conflicts: ElementConflict[] = [];

    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const elementA = elements[i];
        const elementB = elements[j];

        // 只检查同一页面的元素
        if (elementA.pageIndex !== elementB.pageIndex) {
          continue;
        }

        const overlap = this.calculateOverlap(elementA.position, elementB.position);
        if (overlap > 0) {
          conflicts.push({
            elementA: elementA.id,
            elementB: elementB.id,
            pageIndex: elementA.pageIndex,
            overlapArea: overlap,
            severity: overlap > 0.5 ? 'high' : overlap > 0.2 ? 'medium' : 'low'
          });
        }
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  /**
   * 计算两个元素位置的重叠面积（百分比）
   */
  private calculateOverlap(posA: SignatureElement['position'], posB: SignatureElement['position']): number {
    // 计算重叠区域
    const left = Math.max(posA.x, posB.x);
    const right = Math.min(posA.x + posA.width, posB.x + posB.width);
    const top = Math.max(posA.y, posB.y);
    const bottom = Math.min(posA.y + posA.height, posB.y + posB.height);

    // 检查是否有重叠
    if (left >= right || top >= bottom) {
      return 0; // 没有重叠
    }

    // 计算重叠面积
    const overlapArea = (right - left) * (bottom - top);
    const areaA = posA.width * posA.height;
    const areaB = posB.width * posB.height;
    const minArea = Math.min(areaA, areaB);

    return overlapArea / minArea;
  }

  /**
   * 复制文档元数据
   */
  private copyDocumentMetadata(sourceDoc: PDFDocument, targetDoc: PDFDocument): void {
    try {
      const title = sourceDoc.getTitle();
      const author = sourceDoc.getAuthor();
      const subject = sourceDoc.getSubject();
      const keywords = sourceDoc.getKeywords();
      const creator = sourceDoc.getCreator();
      const producer = sourceDoc.getProducer();

      if (title) targetDoc.setTitle(title);
      if (author) targetDoc.setAuthor(author);
      if (subject) targetDoc.setSubject(subject);
      if (keywords) {
        // 处理keywords类型，确保是数组格式
        const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
        targetDoc.setKeywords(keywordArray);
      }
      if (creator) targetDoc.setCreator(creator);
      if (producer) targetDoc.setProducer(producer);

      // 设置修改日期
      targetDoc.setModificationDate(new Date());
    } catch (error) {
      // 元数据复制失败不影响主要功能
      console.warn('Failed to copy document metadata:', error);
    }
  }

  /**
   * 创建操作错误
   */
  private createOperationError(originalError: unknown, message: string): PDFProcessorError {
    const error = originalError as Error;
    
    return {
      code: PDFErrorCode.UNKNOWN_ERROR,
      message,
      details: error.message,
      originalError: error
    };
  }
}

// 准备好的文档接口
export interface PreparedDocument {
  document: PDFDocument;
  fonts: DocumentFonts;
  coordinateTransform: CoordinateTransform;
}

// 文档字体集合
export interface DocumentFonts {
  helvetica: PDFFont;
  helveticaBold: PDFFont;
  timesRoman: PDFFont;
  timesRomanBold: PDFFont;
  default: PDFFont;
}

// 元素验证结果
export interface ElementValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 元素冲突检查结果
export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: ElementConflict[];
}

// 元素冲突信息
export interface ElementConflict {
  elementA: string;
  elementB: string;
  pageIndex: number;
  overlapArea: number; // 重叠面积百分比
  severity: 'low' | 'medium' | 'high';
}

/**
 * 工厂函数：创建PDF操作实例
 */
export function createPDFOperations(): PDFOperations {
  return new PDFOperations();
}

/**
 * 工具函数：快速准备文档用于签字
 */
export async function prepareDocumentForSigning(pdfDoc: PDFDocument): Promise<PreparedDocument> {
  const operations = createPDFOperations();
  return await operations.prepareDocumentForSigning(pdfDoc);
} 