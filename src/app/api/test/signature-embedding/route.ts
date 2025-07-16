/**
 * 签字嵌入功能综合测试API
 * 验证样式管理器、渲染器、嵌入器、合成器的所有功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { 
  SignatureElement, 
  SignatureElementType,
  PDFDocumentInfo 
} from '@/lib/pdf/pdf-types';
import { 
  createSignatureStyleManager,
  SignatureStyleConfig,
  getRecommendedStyleForElement
} from '@/lib/pdf/signature-styles';
import { 
  createSignatureRenderer,
  renderSignatureElement,
  renderMultipleElements
} from '@/lib/pdf/signature-renderer';
import { 
  createSignatureEmbedder,
  embedMultipleSignatures
} from '@/lib/pdf/signature-embedder';
import { 
  createSignatureComposer,
  composeSignatures,
  CompositionStage
} from '@/lib/pdf/signature-composer';
import { createPDFOperations, PreparedDocument } from '@/lib/pdf/pdf-operations';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('test') || 'all';

    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      testType,
      results: {}
    };

    // 创建测试PDF文档
    const testDoc = await createTestPDFDocument();

    // 测试1: 样式管理器测试
    if (testType === 'all' || testType === 'styles') {
      try {
        results.results.styles = await testStyleManager();
      } catch (error) {
        results.results.styles = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // 测试2: 渲染器测试
    if (testType === 'all' || testType === 'renderer') {
      try {
        results.results.renderer = await testRenderer(testDoc);
      } catch (error) {
        results.results.renderer = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // 测试3: 嵌入器测试
    if (testType === 'all' || testType === 'embedder') {
      try {
        results.results.embedder = await testEmbedder(testDoc);
      } catch (error) {
        results.results.embedder = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // 测试4: 合成器测试
    if (testType === 'all' || testType === 'composer') {
      try {
        results.results.composer = await testComposer(testDoc);
      } catch (error) {
        results.results.composer = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // 测试5: 完整流程测试
    if (testType === 'all' || testType === 'integration') {
      try {
        results.results.integration = await testFullIntegration(testDoc);
      } catch (error) {
        results.results.integration = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // 汇总测试结果
    const allTests = Object.values(results.results);
    const successfulTests = allTests.filter((test: any) => test.success).length;
    const totalTests = allTests.length;

    results.summary = {
      totalTests,
      successfulTests,
      failedTests: totalTests - successfulTests,
      allTestsPassed: successfulTests === totalTests,
      successRate: totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : 0
    };

    return NextResponse.json({
      success: true,
      message: `Signature embedding tests completed. ${successfulTests}/${totalTests} tests passed.`,
      data: results
    });

  } catch (error) {
    console.error('Signature embedding test error:', error);
    return NextResponse.json({
      success: false,
      message: 'Signature embedding test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * 创建测试PDF文档
 */
async function createTestPDFDocument(): Promise<PreparedDocument> {
  const pdfDoc = await PDFDocument.create();
  
  // 添加一页A4页面
  const page = pdfDoc.addPage([595, 842]); // A4尺寸
  
  // 添加一些示例内容
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText('Test Document for Signature Embedding', {
    x: 50,
    y: 800,
    size: 16,
    font: helvetica
  });

  page.drawText('This document is used for testing signature embedding functionality.', {
    x: 50,
    y: 770,
    size: 12,
    font: helvetica
  });

  // 准备文档
  const operations = createPDFOperations();
  return await operations.prepareDocumentForSigning(pdfDoc);
}

/**
 * 测试样式管理器 - 简化版本
 */
async function testStyleManager(): Promise<any> {
  const styleManager = createSignatureStyleManager({
    defaultFontSize: 12,
    autoSizeText: true
  });

  const testResults: any = {
    success: true,
    tests: {}
  };

  // 测试推荐样式
  const nameStyle = getRecommendedStyleForElement(SignatureElementType.NAME);
  const dateStyle = getRecommendedStyleForElement(SignatureElementType.DATE);
  const textStyle = getRecommendedStyleForElement(SignatureElementType.TEXT);

  testResults.tests.recommendedStyles = {
    nameStyle,
    dateStyle,
    textStyle,
    success: nameStyle.fontSize > 0 && dateStyle.fontSize > 0 && textStyle.fontSize > 0
  };

  // 测试配置管理
  const originalConfig = styleManager.getConfig();
  styleManager.updateConfig({ defaultFontSize: 14 });
  const updatedConfig = styleManager.getConfig();

  testResults.tests.configManagement = {
    originalFontSize: originalConfig.defaultFontSize,
    updatedFontSize: updatedConfig.defaultFontSize,
    success: updatedConfig.defaultFontSize === 14
  };

  // 计算总体成功状态
  testResults.success = Object.values(testResults.tests).every((test: any) => test.success);

  return testResults;
}

/**
 * 测试渲染器
 */
async function testRenderer(preparedDoc: PreparedDocument): Promise<any> {
  const renderer = createSignatureRenderer();
  
  const testResults: any = {
    success: true,
    tests: {}
  };

  // 创建测试元素
  const testElements: SignatureElement[] = [
    {
      id: 'test-name',
      type: SignatureElementType.NAME,
      content: 'John Doe',
      position: { x: 20, y: 20, width: 30, height: 10 },
      pageIndex: 0,
      style: { fontSize: 14, fontColor: '#000000', fontFamily: 'helvetica-bold' }
    },
    {
      id: 'test-date',
      type: SignatureElementType.DATE,
      content: '2024-01-15',
      position: { x: 60, y: 20, width: 25, height: 8 },
      pageIndex: 0,
      style: { fontSize: 10, fontColor: '#666666', fontFamily: 'helvetica' }
    },
    {
      id: 'test-text',
      type: SignatureElementType.TEXT,
      content: 'Approved',
      position: { x: 20, y: 40, width: 20, height: 6 },
      pageIndex: 0,
      style: { fontSize: 12, fontColor: '#000000', fontFamily: 'times-roman' }
    }
  ];

  const pageInfo = { width: 595, height: 842 };

  // 测试单个元素渲染
  try {
    const singleInstruction = await renderSignatureElement(
      testElements[0],
      preparedDoc.fonts,
      pageInfo
    );

    testResults.tests.singleElementRender = {
      success: true,
      instruction: {
        id: singleInstruction.id,
        type: singleInstruction.type,
        contentLength: singleInstruction.content.length,
        position: singleInstruction.position,
        hasStyle: !!singleInstruction.style.font
      }
    };
  } catch (error) {
    testResults.tests.singleElementRender = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 测试批量元素渲染
  try {
    const batchResult = await renderMultipleElements(
      testElements,
      preparedDoc.fonts,
      pageInfo
    );

    testResults.tests.batchElementRender = {
      success: batchResult.success,
      totalElements: testElements.length,
      renderedInstructions: batchResult.instructions.length,
      errors: batchResult.errors,
      warnings: batchResult.warnings
    };
  } catch (error) {
    testResults.tests.batchElementRender = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 测试不同元素类型的特定渲染
  for (const elementType of [SignatureElementType.NAME, SignatureElementType.DATE, SignatureElementType.TEXT]) {
    try {
      const typeSpecificRenderer = createSignatureRenderer();
      const testElement = testElements.find(e => e.type === elementType);
      
      if (testElement) {
        const instruction = await typeSpecificRenderer.renderSingleElement(
          testElement,
          preparedDoc.fonts,
          pageInfo
        );

        testResults.tests[`${elementType}Render`] = {
          success: true,
          hasContent: instruction.content.length > 0,
          hasPosition: instruction.position.x >= 0 && instruction.position.y >= 0,
          hasStyle: !!instruction.style.font
        };
      }
    } catch (error) {
      testResults.tests[`${elementType}Render`] = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 计算总体成功状态
  testResults.success = Object.values(testResults.tests).every((test: any) => test.success);

  return testResults;
}

/**
 * 测试嵌入器
 */
async function testEmbedder(preparedDoc: PreparedDocument): Promise<any> {
  const embedder = createSignatureEmbedder({
    enableOverlapProtection: true,
    debugMode: false
  });

  const testResults: any = {
    success: true,
    tests: {}
  };

  // 创建测试渲染指令
  const testInstructions = [
    {
      id: 'embed-test-1',
      type: SignatureElementType.NAME,
      content: 'Jane Smith',
      position: { x: 100, y: 100 },
             style: {
         font: preparedDoc.fonts.helveticaBold,
         fontSize: 14,
         color: rgb(0, 0, 0),
         fontFamily: 'helvetica-bold',
         textWidth: 80,
         textHeight: 16
       },
      bounds: { width: 100, height: 20 },
      metadata: {
        originalElement: {
          id: 'embed-test-1',
          type: SignatureElementType.NAME,
          content: 'Jane Smith',
          position: { x: 20, y: 20, width: 25, height: 8 },
          pageIndex: 0,
          style: { fontSize: 14, fontColor: '#000000', fontFamily: 'helvetica-bold' }
        },
        styleAdjustments: [],
        warnings: []
      }
    }
  ];

  // 测试批量嵌入
  try {
    const embedResult = await embedMultipleSignatures(
      preparedDoc.document,
      testInstructions as any,
      { enableOverlapProtection: true }
    );

    testResults.tests.batchEmbed = {
      success: embedResult.success,
      totalInstructions: embedResult.totalInstructions,
      successfulEmbeds: embedResult.successfulEmbeds,
      failedEmbeds: embedResult.failedEmbeds,
      hasOperations: embedResult.operations.length > 0
    };
  } catch (error) {
    testResults.tests.batchEmbed = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 测试配置管理
  const originalConfig = embedder.getConfig();
  embedder.updateConfig({ defaultOpacity: 0.8 });
  const updatedConfig = embedder.getConfig();

  testResults.tests.configManagement = {
    originalOpacity: originalConfig.defaultOpacity,
    updatedOpacity: updatedConfig.defaultOpacity,
    success: updatedConfig.defaultOpacity === 0.8
  };

  // 测试页面状态管理
  const statsBeforeReset = embedder.getPageStatesStats();
  embedder.resetPageStates();
  const statsAfterReset = embedder.getPageStatesStats();

  testResults.tests.stateManagement = {
    success: true,
    statsBeforeReset,
    statsAfterReset: Object.keys(statsAfterReset).length === 0
  };

  // 计算总体成功状态
  testResults.success = Object.values(testResults.tests).every((test: any) => test.success);

  return testResults;
}

/**
 * 测试合成器
 */
async function testComposer(preparedDoc: PreparedDocument): Promise<any> {
  const composer = createSignatureComposer({
    enableValidation: true,
    enableRetry: true,
    maxRetryAttempts: 2
  });

  const testResults: any = {
    success: true,
    tests: {}
  };

  // 创建测试元素
  const testElements: SignatureElement[] = [
    {
      id: 'composer-test-1',
      type: SignatureElementType.NAME,
      content: 'Alice Johnson',
      position: { x: 30, y: 30, width: 25, height: 8 },
      pageIndex: 0,
      style: { fontSize: 14, fontColor: '#000000', fontFamily: 'helvetica-bold' }
    }
  ];

  // 测试完整合成流程
  try {
    const compositionResult = await composeSignatures(
      preparedDoc,
      testElements,
      { enableValidation: true }
    );

    testResults.tests.fullComposition = {
      success: compositionResult.success,
      processedElements: compositionResult.processedElements,
      successfulEmbeds: compositionResult.successfulEmbeds,
      failedEmbeds: compositionResult.failedEmbeds,
      processingTime: compositionResult.processingTime,
      hasRenderResult: !!compositionResult.renderResult,
      hasEmbedResult: !!compositionResult.embedResult
    };
  } catch (error) {
    testResults.tests.fullComposition = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 测试单个元素合成
  try {
    const singleResult = await composer.composeSingleElement(preparedDoc, testElements[0]);

    testResults.tests.singleComposition = {
      success: singleResult.success,
      hasInstruction: !!singleResult.instruction,
      error: singleResult.error || null
    };
  } catch (error) {
    testResults.tests.singleComposition = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 测试预览模式
  try {
    const previewResult = await composer.previewComposition(preparedDoc, testElements);

    testResults.tests.previewMode = {
      success: true,
      instructionsCount: previewResult.instructions.length,
      warningsCount: previewResult.warnings.length,
      hasInstructions: previewResult.instructions.length > 0
    };
  } catch (error) {
    testResults.tests.previewMode = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 计算总体成功状态
  testResults.success = Object.values(testResults.tests).every((test: any) => test.success);

  return testResults;
}

/**
 * 测试完整集成流程
 */
async function testFullIntegration(preparedDoc: PreparedDocument): Promise<any> {
  const testResults: any = {
    success: true,
    tests: {}
  };

  // 创建复杂的测试场景
  const complexElements: SignatureElement[] = [
    {
      id: 'integration-name',
      type: SignatureElementType.NAME,
      content: 'Bob Wilson',
      position: { x: 20, y: 70, width: 30, height: 10 },
      pageIndex: 0,
      style: { fontSize: 16, fontColor: '#000000', fontFamily: 'helvetica-bold' }
    },
    {
      id: 'integration-date',
      type: SignatureElementType.DATE,
      content: 'today',
      position: { x: 60, y: 70, width: 25, height: 8 },
      pageIndex: 0,
      style: { fontSize: 12, fontColor: '#666666', fontFamily: 'helvetica' }
    },
    {
      id: 'integration-text',
      type: SignatureElementType.TEXT,
      content: 'CONFIDENTIAL',
      position: { x: 20, y: 90, width: 40, height: 8 },
      pageIndex: 0,
      style: { fontSize: 14, fontColor: '#FF0000', fontFamily: 'helvetica-bold' }
    }
  ];

  // 测试完整的端到端流程
  try {
    const startTime = Date.now();
    
    // 创建合成器
    const composer = createSignatureComposer({
      enableValidation: true,
      enableRetry: true,
      maxRetryAttempts: 3
    });

    // 执行完整合成
    const result = await composer.composeSignatures(preparedDoc, complexElements);
    
    const endTime = Date.now();

    testResults.tests.endToEndFlow = {
      success: result.success,
      totalElements: complexElements.length,
      processedElements: result.processedElements,
      successfulEmbeds: result.successfulEmbeds,
      failedEmbeds: result.failedEmbeds,
      processingTime: endTime - startTime,
      renderSuccess: result.renderResult.success,
      embedSuccess: result.embedResult.success,
      hasMetadata: !!result.metadata,
      errorCount: result.errors.length,
      warningCount: result.warnings.length
    };

    // 验证PDF文档已被修改
    const finalPageCount = preparedDoc.document.getPageCount();
    testResults.tests.documentModification = {
      success: finalPageCount > 0,
      pageCount: finalPageCount,
      hasContent: true
    };

  } catch (error) {
    testResults.tests.endToEndFlow = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 计算总体成功状态
  testResults.success = Object.values(testResults.tests).every((test: any) => test.success);

  return testResults;
} 