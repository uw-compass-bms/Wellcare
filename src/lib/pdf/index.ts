/**
 * PDF处理模块统一导出
 * 提供清晰的API接口，方便其他模块使用
 */

// 主要类和工厂函数
export { PDFProcessor, createPDFProcessor, analyzePDFFile, validatePDFFile } from './pdf-processor';
export { PDFReader, createPDFReader } from './pdf-reader';
export { PDFAnalyzer, createPDFAnalyzer, analyzePDFQuickInfo } from './pdf-analyzer';
export { PDFOperations, createPDFOperations, prepareDocumentForSigning } from './pdf-operations';

// 基础类型定义（来自 pdf-types）
export type {
  SignatureElement,
  PDFPageInfo,
  PDFDocumentInfo,
  PDFFileInfo,
  PDFProcessorConfig,
  PDFProcessingResult,
  PDFProcessorError,
  CoordinateTransform,
  MultiPDFOperation
} from './pdf-types';

// 分析器类型（来自 pdf-analyzer）
export type { 
  DocumentStructureAnalysis, 
  RecommendedSignatureArea 
} from './pdf-analyzer';

// 操作器类型（来自 pdf-operations）
export type { 
  PreparedDocument, 
  DocumentFonts, 
  ElementValidationResult, 
  ConflictCheckResult, 
  ElementConflict 
} from './pdf-operations';

// 处理器类型（来自 pdf-processor）
export type {
  PDFProcessInput,
  DocumentAnalysisResult,
  PageSignatureRecommendations,
  ValidationResult,
  ElementValidationSummary,
  PreparedDocumentResult,
  BatchProcessingResult
} from './pdf-processor';

// 枚举导出
export { SignatureElementType, PDFErrorCode } from './pdf-types';

// 所有主要功能都已通过上面的导出语句可用
// 用户可以直接使用：
// import { createPDFProcessor, analyzePDFFile, validatePDFFile } from '@/lib/pdf'; 