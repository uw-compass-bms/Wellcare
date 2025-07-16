/**
 * 签字嵌入器
 * 负责将渲染指令实际应用到PDF页面，将文本添加到PDF文档的指定位置
 */

import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import { SignatureRenderInstruction } from './signature-renderer';
import { SignatureElementType } from './pdf-types';
import { DocumentFonts } from './pdf-operations';

// 嵌入配置
export interface SignatureEmbedConfig {
  enableOpacityControl: boolean;
  defaultOpacity: number;
  enableRotation: boolean;
  enableOverlapProtection: boolean;
  debugMode: boolean;
}

// 嵌入操作结果
export interface EmbedOperationResult {
  success: boolean;
  elementId: string;
  pageIndex: number;
  appliedPosition: { x: number; y: number };
  actualTextDimensions: { width: number; height: number };
  adjustments: EmbedAdjustment[];
  error?: string;
}

// 嵌入调整信息
export interface EmbedAdjustment {
  type: 'position' | 'size' | 'opacity' | 'rotation';
  reason: string;
  originalValue: any;
  adjustedValue: any;
}

// 批量嵌入结果
export interface BatchEmbedResult {
  success: boolean;
  totalInstructions: number;
  successfulEmbeds: number;
  failedEmbeds: number;
  operations: EmbedOperationResult[];
  errors: string[];
  warnings: string[];
}

// 页面嵌入状态
export interface PageEmbedState {
  pageIndex: number;
  elementsCount: number;
  occupiedAreas: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    elementId: string;
  }>;
}

export class SignatureEmbedder {
  private config: Required<SignatureEmbedConfig>;
  private pageStates: Map<number, PageEmbedState> = new Map();

  constructor(config: Partial<SignatureEmbedConfig> = {}) {
    this.config = {
      enableOpacityControl: config.enableOpacityControl ?? false,
      defaultOpacity: config.defaultOpacity ?? 1.0,
      enableRotation: config.enableRotation ?? false,
      enableOverlapProtection: config.enableOverlapProtection ?? true,
      debugMode: config.debugMode ?? false
    };
  }

  /**
   * 批量嵌入签字元素到PDF文档
   */
  async embedMultipleInstructions(
    pdfDoc: PDFDocument,
    instructions: SignatureRenderInstruction[]
  ): Promise<BatchEmbedResult> {
    const operations: EmbedOperationResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // 按页面分组指令
    const instructionsByPage = this.groupInstructionsByPage(instructions);

    // 逐页处理
    for (const [pageIndex, pageInstructions] of instructionsByPage.entries()) {
      try {
        const pageResults = await this.embedInstructionsToPage(
          pdfDoc,
          pageIndex,
          pageInstructions
        );
        operations.push(...pageResults.operations);
        warnings.push(...pageResults.warnings);
      } catch (error) {
        const errorMsg = `Failed to process page ${pageIndex}: ${error}`;
        errors.push(errorMsg);
        
        // 为该页面的所有指令创建失败记录
        pageInstructions.forEach(instruction => {
          operations.push({
            success: false,
            elementId: instruction.id,
            pageIndex,
            appliedPosition: { x: 0, y: 0 },
            actualTextDimensions: { width: 0, height: 0 },
            adjustments: [],
            error: errorMsg
          });
        });
      }
    }

    const successfulEmbeds = operations.filter(op => op.success).length;

    return {
      success: successfulEmbeds === instructions.length,
      totalInstructions: instructions.length,
      successfulEmbeds,
      failedEmbeds: instructions.length - successfulEmbeds,
      operations,
      errors,
      warnings
    };
  }

  /**
   * 嵌入指令到指定页面
   */
  async embedInstructionsToPage(
    pdfDoc: PDFDocument,
    pageIndex: number,
    instructions: SignatureRenderInstruction[]
  ): Promise<{ operations: EmbedOperationResult[]; warnings: string[] }> {
    const operations: EmbedOperationResult[] = [];
    const warnings: string[] = [];

    // 获取页面
    const pages = pdfDoc.getPages();
    if (pageIndex >= pages.length) {
      throw new Error(`Page index ${pageIndex} exceeds document page count (${pages.length})`);
    }

    const page = pages[pageIndex];
    const pageState = this.getOrCreatePageState(pageIndex);

    // 检查重叠（如果启用）
    if (this.config.enableOverlapProtection) {
      const overlapCheck = this.checkInstructionOverlaps(instructions, pageState);
      if (overlapCheck.hasOverlaps) {
        warnings.push(`Page ${pageIndex} has overlapping elements: ${overlapCheck.overlappingPairs.join(', ')}`);
      }
    }

    // 逐个嵌入指令
    for (const instruction of instructions) {
      try {
        const result = await this.embedSingleInstruction(page, instruction, pageState);
        operations.push(result);

        // 更新页面状态
        if (result.success) {
          this.updatePageState(pageState, instruction, result);
        }
      } catch (error) {
        operations.push({
          success: false,
          elementId: instruction.id,
          pageIndex,
          appliedPosition: { x: 0, y: 0 },
          actualTextDimensions: { width: 0, height: 0 },
          adjustments: [],
          error: `Failed to embed element: ${error}`
        });
      }
    }

    return { operations, warnings };
  }

  /**
   * 嵌入单个指令到页面
   */
  async embedSingleInstruction(
    page: PDFPage,
    instruction: SignatureRenderInstruction,
    pageState: PageEmbedState
  ): Promise<EmbedOperationResult> {
    const adjustments: EmbedAdjustment[] = [];

    try {
      // 1. 验证指令
      const validation = this.validateInstruction(instruction, page);
      if (!validation.isValid) {
        throw new Error(`Invalid instruction: ${validation.issues.join(', ')}`);
      }

      // 2. 调整位置（如果需要避免重叠）
      let finalPosition = { ...instruction.position };
      if (this.config.enableOverlapProtection) {
        const adjustedPosition = this.adjustPositionForOverlap(
          instruction,
          pageState
        );
        if (adjustedPosition.adjusted) {
          finalPosition = adjustedPosition.position;
          adjustments.push({
            type: 'position',
            reason: 'Adjusted to avoid overlap',
            originalValue: instruction.position,
            adjustedValue: finalPosition
          });
        }
      }

      // 3. 计算实际文本尺寸
      const actualDimensions = {
        width: instruction.style.textWidth,
        height: instruction.style.textHeight
      };

      // 4. 应用透明度设置
      let opacity = this.config.defaultOpacity;
      if (this.config.enableOpacityControl) {
        opacity = this.calculateOpacityForElement(instruction.type);
      }

      // 5. 实际绘制文本到PDF - 使用固定黑色
      page.drawText(instruction.content, {
        x: finalPosition.x,
        y: finalPosition.y,
        size: instruction.style.fontSize,
        font: instruction.style.font,
        color: rgb(0, 0, 0), // 固定使用黑色
        opacity: opacity
      });

      // 6. 调试模式：绘制边界框
      if (this.config.debugMode) {
        this.drawDebugBounds(page, finalPosition, actualDimensions, instruction.id);
      }

      return {
        success: true,
        elementId: instruction.id,
        pageIndex: pageState.pageIndex,
        appliedPosition: finalPosition,
        actualTextDimensions: actualDimensions,
        adjustments
      };
    } catch (error) {
      return {
        success: false,
        elementId: instruction.id,
        pageIndex: pageState.pageIndex,
        appliedPosition: { x: 0, y: 0 },
        actualTextDimensions: { width: 0, height: 0 },
        adjustments,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 验证嵌入指令
   */
  private validateInstruction(
    instruction: SignatureRenderInstruction,
    page: PDFPage
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const pageSize = page.getSize();

    // 检查位置是否在页面范围内
    if (instruction.position.x < 0 || instruction.position.x > pageSize.width) {
      issues.push(`X position ${instruction.position.x} is outside page bounds (0-${pageSize.width})`);
    }

    if (instruction.position.y < 0 || instruction.position.y > pageSize.height) {
      issues.push(`Y position ${instruction.position.y} is outside page bounds (0-${pageSize.height})`);
    }

    // 检查内容
    if (!instruction.content || instruction.content.trim().length === 0) {
      issues.push('Content is empty');
    }

    // 检查样式
    if (!instruction.style.font) {
      issues.push('Font is missing');
    }

    if (instruction.style.fontSize <= 0) {
      issues.push('Font size must be positive');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * 调整位置以避免重叠
   */
  private adjustPositionForOverlap(
    instruction: SignatureRenderInstruction,
    pageState: PageEmbedState
  ): { adjusted: boolean; position: { x: number; y: number } } {
    const originalPos = instruction.position;
    const textBounds = {
      x: originalPos.x,
      y: originalPos.y,
      width: instruction.style.textWidth,
      height: instruction.style.textHeight
    };

    // 检查是否与现有元素重叠
    for (const occupiedArea of pageState.occupiedAreas) {
      if (this.isOverlapping(textBounds, occupiedArea)) {
        // 尝试向右移动
        const adjustedX = occupiedArea.x + occupiedArea.width + 5; // 5px 间距
        if (adjustedX + textBounds.width <= 595) { // 假设A4宽度
          return {
            adjusted: true,
            position: { x: adjustedX, y: originalPos.y }
          };
        }

        // 尝试向下移动
        const adjustedY = occupiedArea.y - textBounds.height - 5; // 5px 间距
        if (adjustedY >= 0) {
          return {
            adjusted: true,
            position: { x: originalPos.x, y: adjustedY }
          };
        }
      }
    }

    return {
      adjusted: false,
      position: originalPos
    };
  }

  /**
   * 检查两个区域是否重叠
   */
  private isOverlapping(
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y
    );
  }

  /**
   * 计算元素类型的透明度
   */
  private calculateOpacityForElement(elementType: SignatureElementType): number {
    switch (elementType) {
      case SignatureElementType.NAME:
        return 1.0; // 姓名完全不透明
      case SignatureElementType.DATE:
        return 0.8; // 日期稍微透明
      case SignatureElementType.TEXT:
        return 0.9; // 文本轻微透明
      default:
        return this.config.defaultOpacity;
    }
  }

  /**
   * 绘制调试边界框
   */
  private drawDebugBounds(
    page: PDFPage,
    position: { x: number; y: number },
    dimensions: { width: number; height: number },
    elementId: string
  ): void {
    // 绘制红色边界框
    page.drawRectangle({
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
      borderColor: rgb(1, 0, 0),
      borderWidth: 1,
      opacity: 0.3
    });

    // 添加元素ID标签（小字）
    page.drawText(`[${elementId}]`, {
      x: position.x,
      y: position.y + dimensions.height + 2,
      size: 6,
      color: rgb(1, 0, 0)
    });
  }

  /**
   * 按页面分组指令
   */
  private groupInstructionsByPage(
    instructions: SignatureRenderInstruction[]
  ): Map<number, SignatureRenderInstruction[]> {
    const grouped = new Map<number, SignatureRenderInstruction[]>();

    instructions.forEach(instruction => {
      const pageIndex = instruction.metadata.originalElement.pageIndex;
      if (!grouped.has(pageIndex)) {
        grouped.set(pageIndex, []);
      }
      grouped.get(pageIndex)!.push(instruction);
    });

    return grouped;
  }

  /**
   * 检查指令重叠
   */
  private checkInstructionOverlaps(
    instructions: SignatureRenderInstruction[],
    pageState: PageEmbedState
  ): { hasOverlaps: boolean; overlappingPairs: string[] } {
    const overlappingPairs: string[] = [];

    for (let i = 0; i < instructions.length; i++) {
      for (let j = i + 1; j < instructions.length; j++) {
        const instr1 = instructions[i];
        const instr2 = instructions[j];

        const bounds1 = {
          x: instr1.position.x,
          y: instr1.position.y,
          width: instr1.style.textWidth,
          height: instr1.style.textHeight
        };

        const bounds2 = {
          x: instr2.position.x,
          y: instr2.position.y,
          width: instr2.style.textWidth,
          height: instr2.style.textHeight
        };

        if (this.isOverlapping(bounds1, bounds2)) {
          overlappingPairs.push(`${instr1.id} & ${instr2.id}`);
        }
      }
    }

    return {
      hasOverlaps: overlappingPairs.length > 0,
      overlappingPairs
    };
  }

  /**
   * 获取或创建页面状态
   */
  private getOrCreatePageState(pageIndex: number): PageEmbedState {
    if (!this.pageStates.has(pageIndex)) {
      this.pageStates.set(pageIndex, {
        pageIndex,
        elementsCount: 0,
        occupiedAreas: []
      });
    }
    return this.pageStates.get(pageIndex)!;
  }

  /**
   * 更新页面状态
   */
  private updatePageState(
    pageState: PageEmbedState,
    instruction: SignatureRenderInstruction,
    result: EmbedOperationResult
  ): void {
    pageState.elementsCount++;
    pageState.occupiedAreas.push({
      x: result.appliedPosition.x,
      y: result.appliedPosition.y,
      width: result.actualTextDimensions.width,
      height: result.actualTextDimensions.height,
      elementId: instruction.id
    });
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SignatureEmbedConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): SignatureEmbedConfig {
    return { ...this.config };
  }

  /**
   * 重置页面状态
   */
  resetPageStates(): void {
    this.pageStates.clear();
  }

  /**
   * 获取页面状态统计
   */
  getPageStatesStats(): { [pageIndex: number]: { elementsCount: number; occupiedAreas: number } } {
    const stats: { [pageIndex: number]: { elementsCount: number; occupiedAreas: number } } = {};
    
    this.pageStates.forEach((state, pageIndex) => {
      stats[pageIndex] = {
        elementsCount: state.elementsCount,
        occupiedAreas: state.occupiedAreas.length
      };
    });

    return stats;
  }
}

/**
 * 工厂函数：创建签字嵌入器
 */
export function createSignatureEmbedder(config?: Partial<SignatureEmbedConfig>): SignatureEmbedder {
  return new SignatureEmbedder(config);
}

/**
 * 工具函数：快速嵌入单个指令
 */
export async function embedSingleSignature(
  pdfDoc: PDFDocument,
  pageIndex: number,
  instruction: SignatureRenderInstruction,
  config?: Partial<SignatureEmbedConfig>
): Promise<EmbedOperationResult> {
  const embedder = createSignatureEmbedder(config);
  const result = await embedder.embedInstructionsToPage(pdfDoc, pageIndex, [instruction]);
  return result.operations[0];
}

/**
 * 工具函数：批量嵌入签字
 */
export async function embedMultipleSignatures(
  pdfDoc: PDFDocument,
  instructions: SignatureRenderInstruction[],
  config?: Partial<SignatureEmbedConfig>
): Promise<BatchEmbedResult> {
  const embedder = createSignatureEmbedder(config);
  return await embedder.embedMultipleInstructions(pdfDoc, instructions);
} 