/**
 * 签字样式管理器
 * 负责字体、尺寸处理，为签字元素提供样式服务
 * 简化版本：统一使用黑色字体，专注于字体和尺寸管理
 */

import { PDFFont, PDFDocument, rgb } from 'pdf-lib';
import { SignatureElement, SignatureElementType } from './pdf-types';
import { DocumentFonts } from './pdf-operations';

// 样式配置接口 - 极简版本，固定字体
export interface SignatureStyleConfig {
  defaultFontSize: number;
  minFontSize: number;
  maxFontSize: number;
  autoSizeText: boolean;
  textPadding: number; // 文本内边距（百分比）
}

// 计算得出的样式 - 极简版本，固定黑色和字体
export interface ComputedSignatureStyle {
  font: PDFFont;
  fontSize: number;
  textWidth: number;
  textHeight: number;
}

// 样式应用结果
export interface StyleApplicationResult {
  success: boolean;
  computedStyle: ComputedSignatureStyle;
  adjustments: StyleAdjustment[];
  warnings: string[];
}

// 样式调整信息 - 移除颜色调整
export interface StyleAdjustment {
  property: 'fontSize' | 'fontFamily';
  originalValue: any;
  adjustedValue: any;
  reason: string;
}

export class SignatureStyleManager {
  private config: Required<SignatureStyleConfig>;
  
  // 统一使用黑色和固定字体
  private static readonly BLACK_COLOR = rgb(0, 0, 0);
  private static readonly FIXED_FONT = 'helveticaBold'; // 固定使用粗体字

  constructor(config: Partial<SignatureStyleConfig> = {}) {
    this.config = {
      defaultFontSize: config.defaultFontSize ?? 12,
      minFontSize: config.minFontSize ?? 8,
      maxFontSize: config.maxFontSize ?? 72,
      autoSizeText: config.autoSizeText ?? true,
      textPadding: config.textPadding ?? 5 // 5% 内边距
    };
  }

  /**
   * 为签字元素应用样式 - 简化版本
   */
  async applyStyleToElement(
    element: SignatureElement,
    availableFonts: DocumentFonts,
    elementBounds: { width: number; height: number }
  ): Promise<StyleApplicationResult> {
    const adjustments: StyleAdjustment[] = [];
    const warnings: string[] = [];

    try {
      // 1. 选择字体
      const font = this.selectFont(element.style.fontFamily, availableFonts);
      
      // 2. 计算字体大小
      const fontSizeResult = this.calculateOptimalFontSize(
        element.content,
        element.style.fontSize,
        font,
        elementBounds
      );

      if (fontSizeResult.adjusted) {
        adjustments.push({
          property: 'fontSize',
          originalValue: element.style.fontSize,
          adjustedValue: fontSizeResult.fontSize,
          reason: fontSizeResult.reason || 'Auto-sizing to fit bounds'
        });
      }

      // 3. 计算文本尺寸
      const textDimensions = this.calculateTextDimensions(
        element.content,
        font,
        fontSizeResult.fontSize
      );

      // 4. 验证样式是否合适
      const validation = this.validateStyle(
        textDimensions,
        elementBounds,
        fontSizeResult.fontSize
      );

      warnings.push(...validation.warnings);

      const computedStyle: ComputedSignatureStyle = {
        font,
        fontSize: fontSizeResult.fontSize,
        textWidth: textDimensions.width,
        textHeight: textDimensions.height
      };

      return {
        success: validation.isValid,
        computedStyle,
        adjustments,
        warnings
      };
    } catch (error) {
      throw new Error(`Failed to apply style to element: ${error}`);
    }
  }

  /**
   * 为不同类型的签字元素生成专用样式
   */
  async generateElementTypeStyle(
    elementType: SignatureElementType,
    content: string,
    availableFonts: DocumentFonts,
    bounds: { width: number; height: number }
  ): Promise<ComputedSignatureStyle> {
    // 根据元素类型设置默认样式偏好
    const typeConfig = this.getElementTypeConfig(elementType);
    
    // 创建临时元素进行样式计算
    const tempElement: SignatureElement = {
      id: 'temp',
      type: elementType,
      content,
      position: { x: 0, y: 0, width: bounds.width, height: bounds.height },
      pageIndex: 0,
      style: {
        fontSize: typeConfig.preferredFontSize,
        fontFamily: 'helvetica-bold', // 固定使用粗体字体
        fontColor: '#000000' // 固定黑色，保持接口兼容性
      }
    };

    const result = await this.applyStyleToElement(tempElement, availableFonts, bounds);
    if (!result.success) {
      throw new Error('Failed to generate element type style');
    }

    return result.computedStyle;
  }

  /**
   * 获取黑色RGB值 - 统一颜色管理
   */
  getTextColor() {
    return SignatureStyleManager.BLACK_COLOR;
  }

  /**
   * 选择字体 - 固定字体版本
   */
  private selectFont(requestedFont: string, availableFonts: DocumentFonts): PDFFont {
    // 固定使用黑体字体，优先级顺序
    const fontOptions: (keyof DocumentFonts)[] = [
      'helveticaBold',  // 首选
      'timesRomanBold', // 备选
      'helvetica',      // 如果没有粗体
      'timesRoman',     // 最后备选
      'default'         // 兜底
    ];

    for (const fontKey of fontOptions) {
      const font = availableFonts[fontKey];
      if (font) {
        return font;
      }
    }

    throw new Error('No fonts available in document');
  }

  /**
   * 计算最佳字体大小
   */
  private calculateOptimalFontSize(
    text: string,
    requestedSize: number,
    font: PDFFont,
    bounds: { width: number; height: number }
  ): { fontSize: number; adjusted: boolean; reason?: string } {
    // 如果禁用自动调整，直接返回请求的大小
    if (!this.config.autoSizeText) {
      const clampedSize = Math.max(
        this.config.minFontSize,
        Math.min(this.config.maxFontSize, requestedSize)
      );
      return {
        fontSize: clampedSize,
        adjusted: clampedSize !== requestedSize,
        reason: clampedSize !== requestedSize ? 'Size clamped to valid range' : undefined
      };
    }

    // 计算可用空间（减去内边距）
    const padding = this.config.textPadding / 100;
    const availableWidth = bounds.width * (1 - padding * 2);
    const availableHeight = bounds.height * (1 - padding * 2);

    // 从请求的大小开始，逐渐调整直到适合
    let fontSize = Math.max(this.config.minFontSize, Math.min(this.config.maxFontSize, requestedSize));
    let iterations = 0;
    const maxIterations = 20;

    while (iterations < maxIterations) {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      if (textWidth <= availableWidth && textHeight <= availableHeight) {
        // 尝试增大字体（如果原来太小）
        if (fontSize < requestedSize) {
          const largerSize = fontSize + 1;
          const largerWidth = font.widthOfTextAtSize(text, largerSize);
          const largerHeight = font.heightAtSize(largerSize);
          
          if (largerWidth <= availableWidth && largerHeight <= availableHeight && largerSize <= this.config.maxFontSize) {
            fontSize = largerSize;
            iterations++;
            continue;
          }
        }
        break;
      } else {
        // 文本太大，减小字体
        fontSize = Math.max(this.config.minFontSize, fontSize - 1);
        if (fontSize === this.config.minFontSize) {
          break;
        }
      }
      iterations++;
    }

    return {
      fontSize,
      adjusted: fontSize !== requestedSize,
      reason: fontSize !== requestedSize ? 
        `Adjusted to fit bounds (${Math.round(availableWidth)}x${Math.round(availableHeight)})` : 
        undefined
    };
  }

  /**
   * 计算文本尺寸
   */
  private calculateTextDimensions(
    text: string,
    font: PDFFont,
    fontSize: number
  ): { width: number; height: number } {
    return {
      width: font.widthOfTextAtSize(text, fontSize),
      height: font.heightAtSize(fontSize)
    };
  }

  /**
   * 验证样式是否合适
   */
  private validateStyle(
    textDimensions: { width: number; height: number },
    bounds: { width: number; height: number },
    fontSize: number
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isValid = true;

    // 检查文本是否超出边界
    if (textDimensions.width > bounds.width) {
      warnings.push(`Text width (${Math.round(textDimensions.width)}) exceeds bounds (${Math.round(bounds.width)})`);
      isValid = false;
    }

    if (textDimensions.height > bounds.height) {
      warnings.push(`Text height (${Math.round(textDimensions.height)}) exceeds bounds (${Math.round(bounds.height)})`);
      isValid = false;
    }

    // 检查字体大小是否太小
    if (fontSize < this.config.minFontSize + 2) {
      warnings.push(`Font size (${fontSize}) is very small, might not be readable`);
    }

    // 检查文本是否太小相对于可用空间
    const utilizationWidth = textDimensions.width / bounds.width;
    const utilizationHeight = textDimensions.height / bounds.height;

    if (utilizationWidth < 0.3 && utilizationHeight < 0.3) {
      warnings.push('Text appears very small relative to available space');
    }

    return { isValid, warnings };
  }

  /**
   * 获取元素类型的默认配置 - 固定字体版本
   */
  private getElementTypeConfig(elementType: SignatureElementType): {
    preferredFontSize: number;
  } {
    switch (elementType) {
      case SignatureElementType.NAME:
        return {
          preferredFontSize: 14
        };
      case SignatureElementType.DATE:
        return {
          preferredFontSize: 10
        };
      case SignatureElementType.TEXT:
        return {
          preferredFontSize: 12
        };
      default:
        return {
          preferredFontSize: this.config.defaultFontSize
        };
    }
  }

  /**
   * 更新样式配置
   */
  updateConfig(newConfig: Partial<SignatureStyleConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // 注：使用固定字体，无需缓存管理
  }

  /**
   * 获取当前配置
   */
  getConfig(): SignatureStyleConfig {
    return { ...this.config };
  }
}

/**
 * 工厂函数：创建签字样式管理器
 */
export function createSignatureStyleManager(config?: Partial<SignatureStyleConfig>): SignatureStyleManager {
  return new SignatureStyleManager(config);
}

/**
 * 工具函数：获取推荐的签字样式 - 固定字体版本
 */
export function getRecommendedStyleForElement(elementType: SignatureElementType): {
  fontSize: number;
} {
  // 简化版本：只配置字体大小，字体固定为黑体
  switch (elementType) {
    case SignatureElementType.NAME:
      return {
        fontSize: 14
      };
    case SignatureElementType.DATE:
      return {
        fontSize: 10
      };
    case SignatureElementType.TEXT:
      return {
        fontSize: 12
      };
    default:
      return {
        fontSize: 12
      };
  }
} 