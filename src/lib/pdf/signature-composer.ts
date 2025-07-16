/**
 * 签字合成器 - 主控制器
 * 协调样式管理器、渲染器、嵌入器，提供完整的签字嵌入工作流
 */

import { PDFDocument } from 'pdf-lib';
import { SignatureElement, SignatureElementType } from './pdf-types';
import { PreparedDocument, DocumentFonts } from './pdf-operations';
import { 
  SignatureStyleManager, 
  SignatureStyleConfig,
  createSignatureStyleManager 
} from './signature-styles';
import { 
  SignatureRenderer, 
  SignatureRenderConfig,
  SignatureRenderInstruction,
  RenderResult,
  createSignatureRenderer 
} from './signature-renderer';
import { 
  SignatureEmbedder, 
  SignatureEmbedConfig,
  BatchEmbedResult,
  createSignatureEmbedder 
} from './signature-embedder';

// 合成器配置
export interface SignatureComposerConfig {
  styleConfig?: Partial<SignatureStyleConfig>;
  renderConfig?: Partial<SignatureRenderConfig>;
  embedConfig?: Partial<SignatureEmbedConfig>;
  
  // 合成器特有配置
  enableValidation: boolean;
  enableRetry: boolean;
  maxRetryAttempts: number;
  enableProgressCallback: boolean;
  enableBatchOptimization: boolean;
}

// 合成操作结果
export interface CompositionResult {
  success: boolean;
  processedElements: number;
  successfulEmbeds: number;
  failedEmbeds: number;
  
  // 详细结果
  renderResult: RenderResult;
  embedResult: BatchEmbedResult;
  
  // 统计信息
  processingTime: number;
  totalOperations: number;
  
  // 错误和警告
  errors: string[];
  warnings: string[];
  
  // 元数据
  metadata: {
    timestamp: Date;
    documentPageCount: number;
    elementsPerPage: { [pageIndex: number]: number };
    retryAttempts: number;
  };
}

// 进度回调接口
export interface ProgressCallback {
  onStageStart: (stage: CompositionStage, totalStages: number) => void;
  onStageProgress: (stage: CompositionStage, progress: number) => void;
  onStageComplete: (stage: CompositionStage, result: any) => void;
  onElementProcessed: (elementId: string, success: boolean) => void;
}

// 合成阶段枚举
export enum CompositionStage {
  VALIDATION = 'validation',
  STYLE_APPLICATION = 'style_application',
  RENDERING = 'rendering',
  EMBEDDING = 'embedding',
  FINALIZATION = 'finalization'
}

export class SignatureComposer {
  private styleManager: SignatureStyleManager;
  private renderer: SignatureRenderer;
  private embedder: SignatureEmbedder;
  private config: Required<SignatureComposerConfig>;
  private progressCallback?: ProgressCallback;

  constructor(config: Partial<SignatureComposerConfig> = {}) {
    this.config = {
      styleConfig: config.styleConfig || {},
      renderConfig: config.renderConfig || {},
      embedConfig: config.embedConfig || {},
      enableValidation: config.enableValidation ?? true,
      enableRetry: config.enableRetry ?? true,
      maxRetryAttempts: config.maxRetryAttempts ?? 3,
      enableProgressCallback: config.enableProgressCallback ?? false,
      enableBatchOptimization: config.enableBatchOptimization ?? true
    };

    // 初始化子组件
    this.styleManager = createSignatureStyleManager(this.config.styleConfig);
    this.renderer = createSignatureRenderer(this.styleManager, this.config.renderConfig);
    this.embedder = createSignatureEmbedder(this.config.embedConfig);
  }

  /**
   * 完整的签字合成流程
   */
  async composeSignatures(
    preparedDoc: PreparedDocument,
    elements: SignatureElement[]
  ): Promise<CompositionResult> {
    const startTime = Date.now();
    
    try {
      // 初始化结果结构
      const result = this.initializeResult(preparedDoc.document, elements);
      
      // 阶段1: 验证
      if (this.config.enableValidation) {
        await this.executeStage(CompositionStage.VALIDATION, async () => {
          return this.validateElements(elements, preparedDoc);
        });
      }

      // 阶段2: 样式应用（已集成在渲染阶段）
      
      // 阶段3: 渲染
      const renderResult = await this.executeStage(CompositionStage.RENDERING, async () => {
        return this.renderElements(elements, preparedDoc);
      });

      // 阶段4: 嵌入
      const embedResult = await this.executeStage(CompositionStage.EMBEDDING, async () => {
        return this.embedInstructions(preparedDoc.document, renderResult.instructions);
      });

      // 阶段5: 完成处理
      await this.executeStage(CompositionStage.FINALIZATION, async () => {
        return this.finalizeComposition(preparedDoc, embedResult);
      });

      // 构建最终结果
      result.success = embedResult.success;
      result.processedElements = elements.length;
      result.successfulEmbeds = embedResult.successfulEmbeds;
      result.failedEmbeds = embedResult.failedEmbeds;
      result.renderResult = renderResult;
      result.embedResult = embedResult;
      result.processingTime = Date.now() - startTime;
      result.errors = [...renderResult.errors, ...embedResult.errors];
      result.warnings = [...renderResult.warnings, ...embedResult.warnings];

      return result;
    } catch (error) {
      return this.handleCompositionError(error, elements, Date.now() - startTime);
    }
  }

  /**
   * 快速合成单个元素
   */
  async composeSingleElement(
    preparedDoc: PreparedDocument,
    element: SignatureElement
  ): Promise<{ success: boolean; instruction?: SignatureRenderInstruction; error?: string }> {
    try {
      // 渲染单个元素
      const pages = preparedDoc.document.getPages();
      const page = pages[element.pageIndex];
      const pageSize = page ? page.getSize() : { width: 595, height: 842 };
      const pageInfo = {
        width: pageSize.width,
        height: pageSize.height
      };

      const instruction = await this.renderer.renderSingleElement(
        element,
        preparedDoc.fonts,
        pageInfo
      );

      // 嵌入单个元素
      const embedResult = await this.embedder.embedInstructionsToPage(
        preparedDoc.document,
        element.pageIndex,
        [instruction]
      );

      return {
        success: embedResult.operations[0]?.success || false,
        instruction,
        error: embedResult.operations[0]?.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 批量合成多种类型的元素
   */
  async composeElementsByType(
    preparedDoc: PreparedDocument,
    elementsByType: { [type in SignatureElementType]?: SignatureElement[] }
  ): Promise<{ [type in SignatureElementType]?: CompositionResult }> {
    const results: { [type in SignatureElementType]?: CompositionResult } = {};

    // 按类型顺序处理（姓名 -> 日期 -> 文本）
    const typeOrder: SignatureElementType[] = [
      SignatureElementType.NAME,
      SignatureElementType.DATE,
      SignatureElementType.TEXT
    ];

    for (const type of typeOrder) {
      const elements = elementsByType[type];
      if (elements && elements.length > 0) {
        // 为每种类型创建专用的渲染器配置
        const typeSpecificRenderer = this.createTypeSpecificRenderer(type);
        const originalRenderer = this.renderer;
        this.renderer = typeSpecificRenderer;

        try {
          results[type] = await this.composeSignatures(preparedDoc, elements);
        } finally {
          // 恢复原始渲染器
          this.renderer = originalRenderer;
        }
      }
    }

    return results;
  }

  /**
   * 预览模式：生成渲染指令但不实际嵌入
   */
  async previewComposition(
    preparedDoc: PreparedDocument,
    elements: SignatureElement[]
  ): Promise<{ instructions: SignatureRenderInstruction[]; warnings: string[] }> {
    const renderResult = await this.renderElements(elements, preparedDoc);
    return {
      instructions: renderResult.instructions,
      warnings: renderResult.warnings
    };
  }

  /**
   * 验证元素
   */
  private async validateElements(
    elements: SignatureElement[],
    preparedDoc: PreparedDocument
  ): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    for (const element of elements) {
      // 检查页面索引
      const pageCount = preparedDoc.document.getPageCount();
      if (element.pageIndex >= pageCount) {
        issues.push(`Element ${element.id}: page index ${element.pageIndex} exceeds document pages`);
      }

      // 检查内容
      if (!element.content || element.content.trim().length === 0) {
        issues.push(`Element ${element.id}: content is empty`);
      }

      // 检查位置
      if (element.position.x < 0 || element.position.x > 100 ||
          element.position.y < 0 || element.position.y > 100) {
        issues.push(`Element ${element.id}: position coordinates out of range (0-100)`);
      }

      // 检查尺寸
      if (element.position.width <= 0 || element.position.height <= 0) {
        issues.push(`Element ${element.id}: dimensions must be positive`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * 渲染元素
   */
  private async renderElements(
    elements: SignatureElement[],
    preparedDoc: PreparedDocument
  ): Promise<RenderResult> {
    // 按页面分组以优化性能
    const elementsByPage = this.groupElementsByPage(elements);
    let allInstructions: SignatureRenderInstruction[] = [];
    let allErrors: string[] = [];
    let allWarnings: string[] = [];

    for (const [pageIndex, pageElements] of elementsByPage.entries()) {
      const pages = preparedDoc.document.getPages();
      const page = pages[pageIndex];
      const pageSize = page ? page.getSize() : { width: 595, height: 842 };
      const pageInfo = {
        width: pageSize.width,
        height: pageSize.height
      };

      try {
        const pageResult = await this.renderer.renderElements(
          pageElements,
          preparedDoc.fonts,
          pageInfo
        );

        allInstructions.push(...pageResult.instructions);
        allErrors.push(...pageResult.errors);
        allWarnings.push(...pageResult.warnings);

        // 进度回调
        if (this.progressCallback) {
          pageElements.forEach(element => {
            const success = pageResult.instructions.some(instr => instr.id === element.id);
            this.progressCallback!.onElementProcessed(element.id, success);
          });
        }
      } catch (error) {
        const errorMsg = `Failed to render page ${pageIndex}: ${error}`;
        allErrors.push(errorMsg);
      }
    }

    return {
      success: allErrors.length === 0,
      instructions: allInstructions,
      errors: allErrors,
      warnings: allWarnings,
      totalElementsProcessed: elements.length
    };
  }

  /**
   * 嵌入指令
   */
  private async embedInstructions(
    pdfDoc: PDFDocument,
    instructions: SignatureRenderInstruction[]
  ): Promise<BatchEmbedResult> {
    if (this.config.enableRetry) {
      return await this.embedWithRetry(pdfDoc, instructions);
    } else {
      return await this.embedder.embedMultipleInstructions(pdfDoc, instructions);
    }
  }

  /**
   * 带重试的嵌入
   */
  private async embedWithRetry(
    pdfDoc: PDFDocument,
    instructions: SignatureRenderInstruction[]
  ): Promise<BatchEmbedResult> {
    let lastResult: BatchEmbedResult;
    let remainingInstructions = [...instructions];

    for (let attempt = 0; attempt < this.config.maxRetryAttempts; attempt++) {
      lastResult = await this.embedder.embedMultipleInstructions(pdfDoc, remainingInstructions);
      
      if (lastResult.success) {
        break;
      }

      // 提取失败的指令进行重试
      const failedInstructions = remainingInstructions.filter((_, index) => 
        !lastResult.operations[index]?.success
      );

      if (failedInstructions.length === 0) {
        break;
      }

      remainingInstructions = failedInstructions;
      
      // 重置嵌入器状态
      this.embedder.resetPageStates();
    }

    return lastResult!;
  }

  /**
   * 完成合成处理
   */
  private async finalizeComposition(
    preparedDoc: PreparedDocument,
    embedResult: BatchEmbedResult
  ): Promise<void> {
    // 这里可以添加后处理逻辑，比如：
    // - 更新文档元数据
    // - 添加水印或署名
    // - 优化PDF文件大小
    // - 验证最终结果

    // 当前只是占位符
    return Promise.resolve();
  }

  /**
   * 执行阶段（带进度回调）
   */
  private async executeStage<T>(
    stage: CompositionStage,
    operation: () => Promise<T>
  ): Promise<T> {
    if (this.progressCallback) {
      this.progressCallback.onStageStart(stage, 5); // 总共5个阶段
    }

    try {
      const result = await operation();
      
      if (this.progressCallback) {
        this.progressCallback.onStageComplete(stage, result);
      }
      
      return result;
    } catch (error) {
      if (this.progressCallback) {
        this.progressCallback.onStageComplete(stage, { error });
      }
      throw error;
    }
  }

  /**
   * 初始化结果结构
   */
  private initializeResult(
    pdfDoc: PDFDocument,
    elements: SignatureElement[]
  ): CompositionResult {
    const pageCount = pdfDoc.getPageCount();
    const elementsPerPage: { [pageIndex: number]: number } = {};
    
    elements.forEach(element => {
      elementsPerPage[element.pageIndex] = (elementsPerPage[element.pageIndex] || 0) + 1;
    });

    return {
      success: false,
      processedElements: 0,
      successfulEmbeds: 0,
      failedEmbeds: 0,
      renderResult: {
        success: false,
        instructions: [],
        errors: [],
        warnings: [],
        totalElementsProcessed: 0
      },
      embedResult: {
        success: false,
        totalInstructions: 0,
        successfulEmbeds: 0,
        failedEmbeds: 0,
        operations: [],
        errors: [],
        warnings: []
      },
      processingTime: 0,
      totalOperations: 0,
      errors: [],
      warnings: [],
      metadata: {
        timestamp: new Date(),
        documentPageCount: pageCount,
        elementsPerPage,
        retryAttempts: 0
      }
    };
  }

  /**
   * 处理合成错误
   */
  private handleCompositionError(
    error: unknown,
    elements: SignatureElement[],
    processingTime: number
  ): CompositionResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown composition error';
    
    return {
      success: false,
      processedElements: elements.length,
      successfulEmbeds: 0,
      failedEmbeds: elements.length,
      renderResult: {
        success: false,
        instructions: [],
        errors: [errorMessage],
        warnings: [],
        totalElementsProcessed: elements.length
      },
      embedResult: {
        success: false,
        totalInstructions: 0,
        successfulEmbeds: 0,
        failedEmbeds: elements.length,
        operations: [],
        errors: [errorMessage],
        warnings: []
      },
      processingTime,
      totalOperations: 0,
      errors: [errorMessage],
      warnings: [],
      metadata: {
        timestamp: new Date(),
        documentPageCount: 0,
        elementsPerPage: {},
        retryAttempts: 0
      }
    };
  }

  /**
   * 按页面分组元素
   */
  private groupElementsByPage(elements: SignatureElement[]): Map<number, SignatureElement[]> {
    const grouped = new Map<number, SignatureElement[]>();
    
    elements.forEach(element => {
      if (!grouped.has(element.pageIndex)) {
        grouped.set(element.pageIndex, []);
      }
      grouped.get(element.pageIndex)!.push(element);
    });

    return grouped;
  }

  /**
   * 创建类型特定的渲染器
   */
  private createTypeSpecificRenderer(elementType: SignatureElementType): SignatureRenderer {
    return SignatureRenderer.createTypeSpecificRenderer(elementType, this.styleManager);
  }

  /**
   * 设置进度回调
   */
  setProgressCallback(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SignatureComposerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 更新子组件配置
    if (newConfig.styleConfig) {
      this.styleManager.updateConfig(newConfig.styleConfig);
    }
    if (newConfig.renderConfig) {
      this.renderer.updateConfig(newConfig.renderConfig);
    }
    if (newConfig.embedConfig) {
      this.embedder.updateConfig(newConfig.embedConfig);
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): SignatureComposerConfig {
    return { ...this.config };
  }
}

/**
 * 工厂函数：创建签字合成器
 */
export function createSignatureComposer(config?: Partial<SignatureComposerConfig>): SignatureComposer {
  return new SignatureComposer(config);
}

/**
 * 工具函数：快速合成签字
 */
export async function composeSignatures(
  preparedDoc: PreparedDocument,
  elements: SignatureElement[],
  config?: Partial<SignatureComposerConfig>
): Promise<CompositionResult> {
  const composer = createSignatureComposer(config);
  return await composer.composeSignatures(preparedDoc, elements);
} 