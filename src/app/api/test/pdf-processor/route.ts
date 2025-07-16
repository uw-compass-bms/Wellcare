/**
 * PDF处理模块测试API
 * 测试PDF读取、分析、操作等核心功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  createPDFProcessor, 
  createPDFReader, 
  createPDFAnalyzer, 
  createPDFOperations,
  PDFProcessorConfig,
  SignatureElement,
  SignatureElementType
} from '@/lib/pdf';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('test') || 'all';

    // 测试配置
    const config: Partial<PDFProcessorConfig> = {
      cacheEnabled: true,
      maxCacheSize: 5,
      defaultFontSize: 12,
      defaultFontColor: '#000000',
      defaultFontFamily: 'helvetica'
    };

    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      testType,
      results: {}
    };

    // 测试1: 工厂函数创建
    if (testType === 'all' || testType === 'factory') {
      try {
        const processor = createPDFProcessor(config);
        const reader = createPDFReader();
        const analyzer = createPDFAnalyzer();
        const operations = createPDFOperations();

        results.results.factory = {
          success: true,
          processor: !!processor,
          reader: !!reader,
          analyzer: !!analyzer,
          operations: !!operations,
          message: 'All factory functions created successfully'
        };
      } catch (error) {
        results.results.factory = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Factory function creation failed'
        };
      }
    }

    // 测试2: 类型验证
    if (testType === 'all' || testType === 'types') {
      try {
        // 创建测试签字元素
        const testElement: SignatureElement = {
          id: 'test-element-1',
          type: SignatureElementType.NAME,
          content: 'John Doe',
          position: {
            x: 50,
            y: 80,
            width: 25,
            height: 10
          },
          pageIndex: 0,
          style: {
            fontSize: 12,
            fontColor: '#000000',
            fontFamily: 'helvetica'
          },
          recipientId: 'test-recipient-1'
        };

        results.results.types = {
          success: true,
          testElement,
          elementType: testElement.type,
          position: testElement.position,
          message: 'Type definitions working correctly'
        };
      } catch (error) {
        results.results.types = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Type validation failed'
        };
      }
    }

    // 测试3: 配置管理
    if (testType === 'all' || testType === 'config') {
      try {
        const processor = createPDFProcessor(config);
        const currentConfig = processor.getConfig();
        
        // 更新配置
        processor.updateConfig({
          defaultFontSize: 14,
          defaultFontColor: '#333333'
        });
        
        const updatedConfig = processor.getConfig();

        results.results.config = {
          success: true,
          originalConfig: currentConfig,
          updatedConfig: updatedConfig,
          configUpdated: updatedConfig.defaultFontSize === 14,
          message: 'Configuration management working correctly'
        };
      } catch (error) {
        results.results.config = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Configuration management failed'
        };
      }
    }

    // 测试4: 坐标转换验证
    if (testType === 'all' || testType === 'coordinates') {
      try {
        const operations = createPDFOperations();
        
        // 模拟页面尺寸（A4: 595x842 points）
        const mockPDFDoc = {
          getPages: () => [{
            getSize: () => ({ width: 595, height: 842 })
          }]
        } as any;

        const coordinateTransform = operations.createCoordinateTransform(mockPDFDoc);
        
        // 测试坐标转换：50% x 50% 应该转换为 297.5 x 421
        const pixelCoords = coordinateTransform.fromPercent(50, 50, 0);
        const percentCoords = coordinateTransform.toPercent(297.5, 421, 0);
        const dimensions = coordinateTransform.getPageDimensions(0);

        results.results.coordinates = {
          success: true,
          pixelCoords,
          percentCoords,
          dimensions,
          conversionCorrect: Math.abs(pixelCoords.x - 297.5) < 1 && Math.abs(pixelCoords.y - 421) < 1,
          message: 'Coordinate transformation working correctly'
        };
      } catch (error) {
        results.results.coordinates = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Coordinate transformation failed'
        };
      }
    }

    // 测试5: 元素验证
    if (testType === 'all' || testType === 'validation') {
      try {
        const operations = createPDFOperations();
        
        // 创建模拟文档信息
        const mockDocumentInfo = {
          pageCount: 2,
          pages: [
            { pageIndex: 0, width: 595, height: 842, rotation: 0 },
            { pageIndex: 1, width: 595, height: 842, rotation: 0 }
          ]
        } as any;

        // 测试有效元素
        const validElement: SignatureElement = {
          id: 'valid-element',
          type: SignatureElementType.NAME,
          content: 'Test Name',
          position: { x: 10, y: 10, width: 20, height: 5 },
          pageIndex: 0,
          style: { fontSize: 12, fontColor: '#000000', fontFamily: 'helvetica' }
        };

        // 测试无效元素（超出边界）
        const invalidElement: SignatureElement = {
          id: 'invalid-element',
          type: SignatureElementType.DATE,
          content: '2024-01-01',
          position: { x: 90, y: 90, width: 20, height: 15 }, // 超出边界
          pageIndex: 0,
          style: { fontSize: 12, fontColor: '#000000', fontFamily: 'helvetica' }
        };

        const validValidation = operations.validateElementPlacement(validElement, mockDocumentInfo);
        const invalidValidation = operations.validateElementPlacement(invalidElement, mockDocumentInfo);

        // 测试冲突检测
        const conflictCheck = operations.checkElementConflicts([validElement, invalidElement]);

        results.results.validation = {
          success: true,
          validElementValid: validValidation.isValid,
          invalidElementInvalid: !invalidValidation.isValid,
          conflictCheck,
          validationErrors: invalidValidation.errors,
          message: 'Element validation working correctly'
        };
      } catch (error) {
        results.results.validation = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Element validation failed'
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
      message: `PDF processor tests completed. ${successfulTests}/${totalTests} tests passed.`,
      data: results
    });

  } catch (error) {
    console.error('PDF processor test error:', error);
    return NextResponse.json({
      success: false,
      message: 'PDF processor test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 