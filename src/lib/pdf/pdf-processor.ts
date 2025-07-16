/**
 * PDF处理主控制器
 * 协调所有PDF处理模块，提供统一的对外接口和工作流管理
 */

import { PDFDocument } from 'pdf-lib';
import { PDFReader, createPDFReader } from './pdf-reader';
import { PDFAnalyzer, createPDFAnalyzer, DocumentStructureAnalysis, RecommendedSignatureArea } from './pdf-analyzer';
import { PDFOperations, createPDFOperations, PreparedDocument, ElementValidationResult, ConflictCheckResult } from './pdf-operations';
import { 
  PDFFileInfo, 
  PDFDocumentInfo, 
  PDFProcessingResult, 
  PDFProcessorConfig,
  PDFProcessorError,
  PDFErrorCode,
  SignatureElement
} from './pdf-types';

export class PDFProcessor {
  private reader: PDFReader;
  private analyzer: PDFAnalyzer;
  private operations: PDFOperations;
  private config: Required<PDFProcessorConfig>;

  constructor(config: Partial<PDFProcessorConfig> = {}) {
    // 设置默认配置
    this.config = {
      cacheEnabled: config.cacheEnabled ?? true,
      maxCacheSize: config.maxCacheSize ?? 10,
      defaultFontSize: config.defaultFontSize ?? 12,
      defaultFontColor: config.defaultFontColor ?? '#000000',
      defaultFontFamily: config.defaultFontFamily ?? 'helvetica'
    };

    // 初始化各个模块
    this.reader = createPDFReader({ useAdminClient: true });
    this.analyzer = createPDFAnalyzer();
    this.operations = createPDFOperations();
  }

  /**
   * 完整的PDF文件处理流程
   */
  async processFile(input: PDFProcessInput): Promise<PDFProcessingResult> {
    try {
      let pdfDoc: PDFDocument;
      
      // 1. 加载PDF文档
      if (input.type === 'url') {
        pdfDoc = await this.reader.loadFromUrl(input.source);
      } else if (input.type === 'fileId') {
        pdfDoc = await this.reader.loadFromFileId(input.source);
      } else {
        throw new Error('Invalid input type');
      }

      // 2. 分析PDF文档
      const documentInfo = await this.analyzer.analyzePDFDocument(pdfDoc);

      // 3. 构建文件信息
      const fileInfo: PDFFileInfo = {
        id: input.fileId || 'unknown',
        fileName: input.fileName || 'document.pdf',
        fileSize: 0, // 实际大小需要从其他地方获取
        mimeType: 'application/pdf',
        supabaseUrl: input.type === 'url' ? input.source : '',
        document: documentInfo
      };

      return {
        success: true,
        fileInfo,
        processedAt: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: this.createProcessorError(error, 'PDF processing failed'),
        processedAt: new Date()
      };
    }
  }

  /**
   * 分析PDF文档结构
   */
  async analyzeDocument(supabaseUrl: string): Promise<DocumentAnalysisResult> {
    try {
      // 加载文档
      const pdfDoc = await this.reader.loadFromUrl(supabaseUrl);
      
      // 分析文档信息
      const documentInfo = await this.analyzer.analyzePDFDocument(pdfDoc);
      
      // 分析文档结构
      const structureAnalysis = this.analyzer.analyzeDocumentStructure(documentInfo);
      
      // 为每个适合的页面生成签字位置推荐
      const signatureRecommendations: PageSignatureRecommendations[] = [];
      for (const pageIndex of structureAnalysis.suitablePagesForSignature) {
        const recommendations = this.analyzer.recommendSignatureAreas(documentInfo, pageIndex);
        signatureRecommendations.push({
          pageIndex,
          recommendations
        });
      }

      return {
        documentInfo,
        structureAnalysis,
        signatureRecommendations
      };
    } catch (error) {
      throw this.createProcessorError(error, 'Document analysis failed');
    }
  }

  /**
   * 验证签字元素
   */
  async validateSignatureElements(
    elements: SignatureElement[],
    documentInfo: PDFDocumentInfo
  ): Promise<ValidationResult> {
    const elementValidations: ElementValidationSummary[] = [];
    let hasErrors = false;

    // 验证每个元素
    for (const element of elements) {
      const validation = this.operations.validateElementPlacement(element, documentInfo);
      elementValidations.push({
        elementId: element.id,
        validation
      });

      if (!validation.isValid) {
        hasErrors = true;
      }
    }

    // 检查元素间冲突
    const conflictCheck = this.operations.checkElementConflicts(elements);

    return {
      isValid: !hasErrors && !conflictCheck.hasConflicts,
      elementValidations,
      conflictCheck
    };
  }

  /**
   * 准备文档用于签字处理
   */
  async prepareForSigning(supabaseUrl: string): Promise<PreparedDocumentResult> {
    try {
      // 加载文档
      const pdfDoc = await this.reader.loadFromUrl(supabaseUrl);
      
      // 创建文档副本
      const documentCopy = await this.operations.createDocumentCopy(pdfDoc);
      
      // 准备签字资源
      const preparedDoc = await this.operations.prepareDocumentForSigning(documentCopy);
      
      // 分析文档信息
      const documentInfo = await this.analyzer.analyzePDFDocument(pdfDoc);

      return {
        preparedDocument: preparedDoc,
        documentInfo,
        isReady: true
      };
    } catch (error) {
      throw this.createProcessorError(error, 'Failed to prepare document for signing');
    }
  }

  /**
   * 批量处理多个PDF文件
   */
  async processBatch(inputs: PDFProcessInput[]): Promise<BatchProcessingResult> {
    const results: PDFProcessingResult[] = [];
    const errors: PDFProcessorError[] = [];

    for (const input of inputs) {
      try {
        const result = await this.processFile(input);
        results.push(result);
        
        if (!result.success && result.error) {
          errors.push(result.error);
        }
      } catch (processingError) {
        const processorError = this.createProcessorError(processingError, `Failed to process file: ${input.fileName}`);
        errors.push(processorError);
        results.push({
          success: false,
          error: processorError,
          processedAt: new Date()
        });
      }
    }

    return {
      totalFiles: inputs.length,
      successfulFiles: results.filter(r => r.success).length,
      failedFiles: errors.length,
      results,
      errors
    };
  }

  /**
   * 获取处理器配置
   */
  getConfig(): PDFProcessorConfig {
    return { ...this.config };
  }

  /**
   * 更新处理器配置
   */
  updateConfig(newConfig: Partial<PDFProcessorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 创建统一的处理器错误
   */
  private createProcessorError(originalError: unknown, message: string): PDFProcessorError {
    const error = originalError as Error;
    
    let errorCode: PDFErrorCode;
    
    if (error.message.includes('not found') || error.message.includes('404')) {
      errorCode = PDFErrorCode.FILE_NOT_FOUND;
    } else if (error.message.includes('Invalid PDF') || error.message.includes('format')) {
      errorCode = PDFErrorCode.INVALID_PDF;
    } else if (error.message.includes('Failed to load') || error.message.includes('download')) {
      errorCode = PDFErrorCode.LOAD_FAILED;
    } else if (error.message.includes('analyze') || error.message.includes('parse')) {
      errorCode = PDFErrorCode.PARSE_FAILED;
    } else if (error.message.includes('Supabase')) {
      errorCode = PDFErrorCode.SUPABASE_ERROR;
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      errorCode = PDFErrorCode.NETWORK_ERROR;
    } else {
      errorCode = PDFErrorCode.UNKNOWN_ERROR;
    }

    return {
      code: errorCode,
      message,
      details: error.message,
      originalError: error
    };
  }
}

// 处理输入接口
export interface PDFProcessInput {
  type: 'url' | 'fileId';
  source: string; // URL或文件ID
  fileId?: string;
  fileName?: string;
}

// 文档分析结果
export interface DocumentAnalysisResult {
  documentInfo: PDFDocumentInfo;
  structureAnalysis: DocumentStructureAnalysis;
  signatureRecommendations: PageSignatureRecommendations[];
}

// 页面签字推荐
export interface PageSignatureRecommendations {
  pageIndex: number;
  recommendations: RecommendedSignatureArea[];
}

// 验证结果
export interface ValidationResult {
  isValid: boolean;
  elementValidations: ElementValidationSummary[];
  conflictCheck: ConflictCheckResult;
}

// 元素验证摘要
export interface ElementValidationSummary {
  elementId: string;
  validation: ElementValidationResult;
}

// 准备好的文档结果
export interface PreparedDocumentResult {
  preparedDocument: PreparedDocument;
  documentInfo: PDFDocumentInfo;
  isReady: boolean;
}

// 批处理结果
export interface BatchProcessingResult {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  results: PDFProcessingResult[];
  errors: PDFProcessorError[];
}

/**
 * 工厂函数：创建PDF处理器实例
 */
export function createPDFProcessor(config?: Partial<PDFProcessorConfig>): PDFProcessor {
  return new PDFProcessor(config);
}

/**
 * 工具函数：快速分析PDF文件
 */
export async function analyzePDFFile(supabaseUrl: string): Promise<DocumentAnalysisResult> {
  const processor = createPDFProcessor();
  return await processor.analyzeDocument(supabaseUrl);
}

/**
 * 工具函数：验证PDF文件是否可处理
 */
export async function validatePDFFile(supabaseUrl: string): Promise<boolean> {
  try {
    const processor = createPDFProcessor();
    const result = await processor.processFile({
      type: 'url',
      source: supabaseUrl,
      fileName: 'test.pdf'
    });
    return result.success;
  } catch {
    return false;
  }
} 