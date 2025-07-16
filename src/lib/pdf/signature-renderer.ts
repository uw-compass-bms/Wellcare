/**
 * 签字元素渲染器
 * 负责分别处理姓名、日期、文本的渲染逻辑，生成渲染指令
 */

// import { PDFPage } from 'pdf-lib'; // 暂时不需要，将在后续模块中使用
import { SignatureElement, SignatureElementType } from './pdf-types';
import { DocumentFonts } from './pdf-operations';
import { 
  SignatureStyleManager, 
  ComputedSignatureStyle, 
  StyleApplicationResult,
  createSignatureStyleManager 
} from './signature-styles';

// 渲染指令接口
export interface SignatureRenderInstruction {
  id: string;
  type: SignatureElementType;
  content: string;
  position: {
    x: number; // PDF坐标系中的像素位置
    y: number; // PDF坐标系中的像素位置
  };
  style: ComputedSignatureStyle;
  bounds: {
    width: number;
    height: number;
  };
  metadata: {
    originalElement: SignatureElement;
    styleAdjustments: any[];
    warnings: string[];
  };
}

// 渲染配置
export interface SignatureRenderConfig {
  enableTextAlignment: boolean;
  textAlignment: 'left' | 'center' | 'right';
  enableDateFormatting: boolean;
  dateFormat: string;
  enableNameFormatting: boolean;
  nameFormat: 'original' | 'uppercase' | 'lowercase' | 'titlecase';
}

// 渲染结果
export interface RenderResult {
  success: boolean;
  instructions: SignatureRenderInstruction[];
  errors: string[];
  warnings: string[];
  totalElementsProcessed: number;
}

export class SignatureRenderer {
  private styleManager: SignatureStyleManager;
  private config: Required<SignatureRenderConfig>;

  constructor(
    styleManager?: SignatureStyleManager,
    config: Partial<SignatureRenderConfig> = {}
  ) {
    this.styleManager = styleManager || createSignatureStyleManager();
    this.config = {
      enableTextAlignment: config.enableTextAlignment ?? true,
      textAlignment: config.textAlignment ?? 'left',
      enableDateFormatting: config.enableDateFormatting ?? true,
      dateFormat: config.dateFormat ?? 'YYYY-MM-DD',
      enableNameFormatting: config.enableNameFormatting ?? false,
      nameFormat: config.nameFormat ?? 'original'
    };
  }

  /**
   * 渲染多个签字元素
   */
  async renderElements(
    elements: SignatureElement[],
    availableFonts: DocumentFonts,
    pageInfo: { width: number; height: number }
  ): Promise<RenderResult> {
    const instructions: SignatureRenderInstruction[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const element of elements) {
      try {
        const instruction = await this.renderSingleElement(
          element,
          availableFonts,
          pageInfo
        );
        instructions.push(instruction);
        warnings.push(...instruction.metadata.warnings);
      } catch (error) {
        errors.push(`Failed to render element ${element.id}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      instructions,
      errors,
      warnings,
      totalElementsProcessed: elements.length
    };
  }

  /**
   * 渲染单个签字元素
   */
  async renderSingleElement(
    element: SignatureElement,
    availableFonts: DocumentFonts,
    pageInfo: { width: number; height: number }
  ): Promise<SignatureRenderInstruction> {
    try {
      // 1. 预处理元素内容（格式化）
      const processedContent = this.preprocessElementContent(element);
      
      // 2. 计算元素边界（像素）
      const elementBounds = this.calculateElementBounds(element, pageInfo);
      
      // 3. 应用样式
      const modifiedElement = { ...element, content: processedContent };
      const styleResult = await this.styleManager.applyStyleToElement(
        modifiedElement,
        availableFonts,
        elementBounds
      );

      // 4. 计算精确位置
      const position = this.calculateRenderPosition(
        element,
        styleResult.computedStyle,
        pageInfo
      );

      // 5. 创建渲染指令
      const instruction: SignatureRenderInstruction = {
        id: element.id,
        type: element.type,
        content: processedContent,
        position,
        style: styleResult.computedStyle,
        bounds: elementBounds,
        metadata: {
          originalElement: element,
          styleAdjustments: styleResult.adjustments,
          warnings: styleResult.warnings
        }
      };

      return instruction;
    } catch (error) {
      throw new Error(`Failed to render element ${element.id}: ${error}`);
    }
  }

  /**
   * 预处理元素内容（格式化）
   */
  private preprocessElementContent(element: SignatureElement): string {
    switch (element.type) {
      case SignatureElementType.NAME:
        return this.formatName(element.content);
      case SignatureElementType.DATE:
        return this.formatDate(element.content);
      case SignatureElementType.TEXT:
        return this.formatText(element.content);
      default:
        return element.content;
    }
  }

  /**
   * 格式化姓名
   */
  private formatName(name: string): string {
    if (!this.config.enableNameFormatting) {
      return name;
    }

    const trimmedName = name.trim();
    
    switch (this.config.nameFormat) {
      case 'uppercase':
        return trimmedName.toUpperCase();
      case 'lowercase':
        return trimmedName.toLowerCase();
      case 'titlecase':
        return trimmedName.replace(/\w\S*/g, (txt) => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
      default:
        return trimmedName;
    }
  }

  /**
   * 格式化日期
   */
  private formatDate(dateString: string): string {
    if (!this.config.enableDateFormatting) {
      return dateString;
    }

    try {
      // 尝试解析日期
      const date = new Date(dateString);
      
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        // 如果不是有效日期，检查是否是"今天"之类的特殊值
        if (dateString.toLowerCase().includes('today') || dateString.toLowerCase().includes('现在')) {
          return this.formatDateByPattern(new Date(), this.config.dateFormat);
        }
        return dateString; // 返回原始字符串
      }

      return this.formatDateByPattern(date, this.config.dateFormat);
    } catch {
      return dateString; // 格式化失败时返回原始字符串
    }
  }

  /**
   * 按照模式格式化日期
   */
  private formatDateByPattern(date: Date, pattern: string): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return pattern
      .replace('YYYY', year.toString())
      .replace('MM', month.toString().padStart(2, '0'))
      .replace('DD', day.toString().padStart(2, '0'))
      .replace('M', month.toString())
      .replace('D', day.toString());
  }

  /**
   * 格式化文本
   */
  private formatText(text: string): string {
    // 基础文本清理
    return text.trim();
  }

  /**
   * 计算元素边界（像素）
   */
  private calculateElementBounds(
    element: SignatureElement,
    pageInfo: { width: number; height: number }
  ): { width: number; height: number } {
    return {
      width: (element.position.width / 100) * pageInfo.width,
      height: (element.position.height / 100) * pageInfo.height
    };
  }

  /**
   * 计算渲染位置（PDF坐标系）
   */
  private calculateRenderPosition(
    element: SignatureElement,
    computedStyle: ComputedSignatureStyle,
    pageInfo: { width: number; height: number }
  ): { x: number; y: number } {
    // 转换百分比坐标到像素坐标
    const baseX = (element.position.x / 100) * pageInfo.width;
    const baseY = pageInfo.height - (element.position.y / 100) * pageInfo.height; // PDF坐标系Y轴翻转

    // 根据文本对齐方式调整X坐标
    let adjustedX = baseX;
    if (this.config.enableTextAlignment) {
      const elementWidth = (element.position.width / 100) * pageInfo.width;
      
      switch (this.config.textAlignment) {
        case 'center':
          adjustedX = baseX + (elementWidth - computedStyle.textWidth) / 2;
          break;
        case 'right':
          adjustedX = baseX + elementWidth - computedStyle.textWidth;
          break;
        case 'left':
        default:
          // 保持原位置
          break;
      }
    }

    // 调整Y坐标到文本基线
    const adjustedY = baseY - computedStyle.textHeight;

    return {
      x: Math.round(adjustedX),
      y: Math.round(adjustedY)
    };
  }

  /**
   * 验证渲染指令
   */
  validateRenderInstruction(
    instruction: SignatureRenderInstruction,
    pageInfo: { width: number; height: number }
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // 检查位置是否在页面范围内
    if (instruction.position.x < 0 || instruction.position.x > pageInfo.width) {
      issues.push(`X position (${instruction.position.x}) is outside page bounds (0-${pageInfo.width})`);
    }

    if (instruction.position.y < 0 || instruction.position.y > pageInfo.height) {
      issues.push(`Y position (${instruction.position.y}) is outside page bounds (0-${pageInfo.height})`);
    }

    // 检查文本是否会超出边界
    const textEndX = instruction.position.x + instruction.style.textWidth;
    const textEndY = instruction.position.y + instruction.style.textHeight;

    if (textEndX > pageInfo.width) {
      issues.push(`Text extends beyond page width (${textEndX} > ${pageInfo.width})`);
    }

    if (textEndY > pageInfo.height) {
      issues.push(`Text extends beyond page height (${textEndY} > ${pageInfo.height})`);
    }

    // 检查内容是否为空
    if (!instruction.content.trim()) {
      issues.push('Content is empty or whitespace only');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * 创建元素类型特定的渲染器
   */
  static createTypeSpecificRenderer(
    elementType: SignatureElementType,
    styleManager?: SignatureStyleManager
  ): SignatureRenderer {
    let config: Partial<SignatureRenderConfig> = {};

    switch (elementType) {
      case SignatureElementType.NAME:
        config = {
          enableNameFormatting: true,
          nameFormat: 'titlecase',
          textAlignment: 'center'
        };
        break;
      case SignatureElementType.DATE:
        config = {
          enableDateFormatting: true,
          dateFormat: 'YYYY-MM-DD',
          textAlignment: 'right'
        };
        break;
      case SignatureElementType.TEXT:
        config = {
          textAlignment: 'left'
        };
        break;
    }

    return new SignatureRenderer(styleManager, config);
  }

  /**
   * 更新渲染配置
   */
  updateConfig(newConfig: Partial<SignatureRenderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取当前配置
   */
  getConfig(): SignatureRenderConfig {
    return { ...this.config };
  }
}

/**
 * 工厂函数：创建签字渲染器
 */
export function createSignatureRenderer(
  styleManager?: SignatureStyleManager,
  config?: Partial<SignatureRenderConfig>
): SignatureRenderer {
  return new SignatureRenderer(styleManager, config);
}

/**
 * 工具函数：快速渲染单个元素
 */
export async function renderSignatureElement(
  element: SignatureElement,
  availableFonts: DocumentFonts,
  pageInfo: { width: number; height: number },
  styleManager?: SignatureStyleManager
): Promise<SignatureRenderInstruction> {
  const renderer = createSignatureRenderer(styleManager);
  return await renderer.renderSingleElement(element, availableFonts, pageInfo);
}

/**
 * 工具函数：批量渲染元素
 */
export async function renderMultipleElements(
  elements: SignatureElement[],
  availableFonts: DocumentFonts,
  pageInfo: { width: number; height: number },
  styleManager?: SignatureStyleManager
): Promise<RenderResult> {
  const renderer = createSignatureRenderer(styleManager);
  return await renderer.renderElements(elements, availableFonts, pageInfo);
} 