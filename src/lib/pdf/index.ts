/**
 * PDF处理模块统一导出
 * 提供清晰的API接口，方便其他模块使用
 */

// 主要类和工厂函数
export { PDFProcessor, createPDFProcessor, analyzePDFFile, validatePDFFile } from './pdf-processor';
export { PDFReader, createPDFReader } from './pdf-reader';
export { PDFAnalyzer, createPDFAnalyzer, analyzePDFQuickInfo } from './pdf-analyzer';
export { PDFOperations, createPDFOperations, prepareDocumentForSigning } from './pdf-operations';
export { SignatureComposer, createSignatureComposer, composeSignatures } from './signature-composer';
export { SignatureEmbedder, createSignatureEmbedder } from './signature-embedder';
export { SignatureRenderer, createSignatureRenderer } from './signature-renderer';
export { SignatureStyleManager, createSignatureStyleManager } from './signature-styles';

// 基础类型定义
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

// 分析器类型
export type { 
  DocumentStructureAnalysis, 
  RecommendedSignatureArea 
} from './pdf-analyzer';

// 操作器类型
export type { 
  PreparedDocument, 
  DocumentFonts, 
  ElementValidationResult, 
  ConflictCheckResult, 
  ElementConflict 
} from './pdf-operations';

// 处理器类型
export type {
  PDFProcessInput,
  DocumentAnalysisResult,
  PageSignatureRecommendations,
  ValidationResult,
  ElementValidationSummary,
  PreparedDocumentResult,
  BatchProcessingResult
} from './pdf-processor';

// 渲染器类型
export type {
  SignatureRenderInstruction,
  SignatureRenderConfig,
  RenderResult
} from './signature-renderer';

// 样式管理器类型
export type {
  SignatureStyleConfig,
  ComputedSignatureStyle,
  StyleApplicationResult
} from './signature-styles';

// 嵌入器类型
export type {
  SignatureEmbedConfig,
  EmbedOperationResult,
  BatchEmbedResult
} from './signature-embedder';

// 枚举导出
export { SignatureElementType, PDFErrorCode } from './pdf-types';

// 所有主要功能都已通过上面的导出语句可用
// 用户可以直接使用：
// import { createPDFProcessor, analyzePDFFile, validatePDFFile } from '@/lib/pdf'; 