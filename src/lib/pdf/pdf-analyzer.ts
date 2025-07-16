/**
 * PDF信息分析模块
 * 负责分析PDF文档的页面信息、尺寸、内容等
 */

import { PDFDocument, PDFPage } from 'pdf-lib';
import { PDFDocumentInfo, PDFPageInfo, PDFProcessorError, PDFErrorCode } from './pdf-types';

export class PDFAnalyzer {
  /**
   * 分析PDF文档完整信息
   */
  async analyzePDFDocument(pdfDoc: PDFDocument): Promise<PDFDocumentInfo> {
    try {
      const pages = pdfDoc.getPages();
      const pageCount = pages.length;

      // 分析所有页面信息
      const pageInfos: PDFPageInfo[] = pages.map((page, index) => 
        this.analyzePageInfo(page, index)
      );

      // 提取文档元数据
      const metadata = this.extractDocumentMetadata(pdfDoc);

      return {
        pageCount,
        pages: pageInfos,
        ...metadata
      };
    } catch (error) {
      throw this.createAnalysisError(error, 'Failed to analyze PDF document');
    }
  }

  /**
   * 分析单个页面信息
   */
  analyzePageInfo(page: PDFPage, pageIndex: number): PDFPageInfo {
    const { width, height } = page.getSize();
    const rotation = page.getRotation().angle;

    return {
      pageIndex,
      width,
      height,
      rotation
    };
  }

  /**
   * 提取PDF文档元数据
   */
  private extractDocumentMetadata(pdfDoc: PDFDocument): Partial<PDFDocumentInfo> {
    try {
      const title = pdfDoc.getTitle();
      const author = pdfDoc.getAuthor();
      const subject = pdfDoc.getSubject();
      const creator = pdfDoc.getCreator();
      const producer = pdfDoc.getProducer();
      const creationDate = pdfDoc.getCreationDate();
      const modificationDate = pdfDoc.getModificationDate();

      return {
        title: title || undefined,
        author: author || undefined,
        subject: subject || undefined,
        creator: creator || undefined,
        producer: producer || undefined,
        creationDate: creationDate || undefined,
        modificationDate: modificationDate || undefined
      };
    } catch {
      // 元数据提取失败不影响主要功能
      console.warn('Failed to extract PDF metadata');
      return {};
    }
  }

  /**
   * 获取页面尺寸信息
   */
  getPageDimensions(pdfDoc: PDFDocument, pageIndex: number): { width: number; height: number } {
    const pages = pdfDoc.getPages();
    
    if (pageIndex < 0 || pageIndex >= pages.length) {
      throw new Error(`Invalid page index: ${pageIndex}. Document has ${pages.length} pages.`);
    }

    const page = pages[pageIndex];
    return page.getSize();
  }

  /**
   * 检查页面是否适合放置签字元素
   */
  isPageSuitableForSignature(pdfDoc: PDFDocument, pageIndex: number): boolean {
    try {
      const { width, height } = this.getPageDimensions(pdfDoc, pageIndex);
      
      // 检查页面尺寸是否合理
      const minDimension = 50; // 最小尺寸
      const maxDimension = 5000; // 最大尺寸
      
      return width >= minDimension && width <= maxDimension &&
             height >= minDimension && height <= maxDimension;
    } catch {
      return false;
    }
  }

  /**
   * 分析PDF文档的结构类型
   */
  analyzeDocumentStructure(documentInfo: PDFDocumentInfo): DocumentStructureAnalysis {
    const { pageCount, pages } = documentInfo;
    
    // 根据页数判断文档类型
    let documentType: 'single_page' | 'multi_page' | 'large_document';
    if (pageCount === 1) {
      documentType = 'single_page';
    } else if (pageCount <= 10) {
      documentType = 'multi_page';
    } else {
      documentType = 'large_document';
    }

    // 分析页面尺寸一致性
    const firstPageSize = pages[0];
    const hasConsistentSize = pages.every(page => 
      Math.abs(page.width - firstPageSize.width) < 5 &&
      Math.abs(page.height - firstPageSize.height) < 5
    );

    // 计算平均页面尺寸
    const avgWidth = pages.reduce((sum, page) => sum + page.width, 0) / pageCount;
    const avgHeight = pages.reduce((sum, page) => sum + page.height, 0) / pageCount;

    // 判断页面方向
    const orientation = avgWidth > avgHeight ? 'landscape' : 'portrait';

    return {
      documentType,
      pageCount,
      hasConsistentSize,
      orientation,
      averagePageSize: {
        width: Math.round(avgWidth),
        height: Math.round(avgHeight)
      },
      suitablePagesForSignature: pages
        .map((_, index) => index)
        .filter(index => this.isPageSuitableForSignature_Analysis(pages[index]))
    };
  }

  /**
   * 推荐签字位置区域
   */
  recommendSignatureAreas(documentInfo: PDFDocumentInfo, pageIndex: number): RecommendedSignatureArea[] {
    const page = documentInfo.pages[pageIndex];
    if (!page) {
      return [];
    }
    const recommendations: RecommendedSignatureArea[] = [];

    // 右下角区域（常见签字位置）
    recommendations.push({
      x: 60, // 60% from left
      y: 80, // 80% from top
      width: 30,
      height: 15,
      confidence: 0.9,
      reason: 'Traditional signature position - bottom right'
    });

    // 底部中心区域
    recommendations.push({
      x: 35, // 35% from left
      y: 80, // 80% from top
      width: 30,
      height: 15,
      confidence: 0.7,
      reason: 'Center bottom area - good for centered documents'
    });

    // 右上角区域（适合日期）
    recommendations.push({
      x: 70, // 70% from left
      y: 10, // 10% from top
      width: 25,
      height: 10,
      confidence: 0.6,
      reason: 'Top right area - suitable for date placement'
    });

    return recommendations;
  }

  /**
   * 验证坐标是否在页面范围内
   */
  validateCoordinates(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    pageIndex: number, 
    documentInfo: PDFDocumentInfo
  ): boolean {
    const page = documentInfo.pages[pageIndex];
    if (!page) {
      return false;
    }

    // 检查百分比坐标是否在合理范围内
    return x >= 0 && x <= 100 &&
           y >= 0 && y <= 100 &&
           width > 0 && width <= 100 &&
           height > 0 && height <= 100 &&
           (x + width) <= 100 &&
           (y + height) <= 100;
  }

  /**
   * 内部方法：检查页面是否适合签字（用于分析）
   */
  private isPageSuitableForSignature_Analysis(page: PDFPageInfo): boolean {
    const minDimension = 50;
    const maxDimension = 5000;
    
    return page.width >= minDimension && page.width <= maxDimension &&
           page.height >= minDimension && page.height <= maxDimension;
  }

  /**
   * 创建分析错误
   */
  private createAnalysisError(originalError: unknown, message: string): PDFProcessorError {
    const error = originalError as Error;
    
    return {
      code: PDFErrorCode.PARSE_FAILED,
      message,
      details: error.message,
      originalError: error
    };
  }
}

// 文档结构分析结果
export interface DocumentStructureAnalysis {
  documentType: 'single_page' | 'multi_page' | 'large_document';
  pageCount: number;
  hasConsistentSize: boolean;
  orientation: 'portrait' | 'landscape';
  averagePageSize: {
    width: number;
    height: number;
  };
  suitablePagesForSignature: number[];
}

// 推荐签字区域
export interface RecommendedSignatureArea {
  x: number; // 百分比坐标
  y: number; // 百分比坐标
  width: number; // 百分比宽度
  height: number; // 百分比高度
  confidence: number; // 置信度 0-1
  reason: string; // 推荐理由
}

/**
 * 工厂函数：创建PDF分析器实例
 */
export function createPDFAnalyzer(): PDFAnalyzer {
  return new PDFAnalyzer();
}

/**
 * 工具函数：快速分析PDF并获取基本信息
 */
export async function analyzePDFQuickInfo(pdfDoc: PDFDocument): Promise<{
  pageCount: number;
  firstPageSize: { width: number; height: number };
  allPagesSameSize: boolean;
}> {
  const analyzer = createPDFAnalyzer();
  const documentInfo = await analyzer.analyzePDFDocument(pdfDoc);
  
  const firstPage = documentInfo.pages[0];
  const allPagesSameSize = documentInfo.pages.every(page => 
    Math.abs(page.width - firstPage.width) < 1 &&
    Math.abs(page.height - firstPage.height) < 1
  );

  return {
    pageCount: documentInfo.pageCount,
    firstPageSize: {
      width: firstPage.width,
      height: firstPage.height
    },
    allPagesSameSize
  };
} 