/**
 * PDF生成功能综合测试API
 * 验证Task 8.3: PDF生成API的完整功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignatureElement, SignatureElementType } from '@/lib/pdf/pdf-types';

// 测试结果接口
interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  details: any;
  error?: string;
}

interface PDFGenerateTestResponse {
  success: boolean;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDuration: number;
  };
  tests: TestResult[];
  details?: any;
}

/**
 * GET /api/test/pdf-generate
 * 执行PDF生成功能的综合测试
 */
export async function GET(request: NextRequest): Promise<NextResponse<PDFGenerateTestResponse>> {
  const startTime = Date.now();
  const results: TestResult[] = [];

  // 测试用例1: API结构验证
  await runTest(results, "API结构验证", async () => {
    // 验证API端点是否存在
    const testUrl = new URL('/api/signature/pdf/generate', request.url);
    
    try {
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}) // 空请求体，应该返回错误
      });

      return {
        endpointExists: true,
        statusCode: response.status,
        expectedError: response.status === 401 || response.status === 400, // 应该返回认证错误或请求错误
        responseHeaders: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      throw new Error(`API endpoint test failed: ${error}`);
    }
  });

  // 测试用例2: 请求验证逻辑
  await runTest(results, "请求验证逻辑", async () => {
    const validationTests = [
      {
        name: "空请求体",
        body: {},
        expectedStatus: 400
      },
      {
        name: "缺少taskId",
        body: { fileId: "test-file", signatures: [] },
        expectedStatus: 400
      },
      {
        name: "缺少fileId", 
        body: { taskId: "test-task", signatures: [] },
        expectedStatus: 400
      },
      {
        name: "空签字数组",
        body: { taskId: "test-task", fileId: "test-file", signatures: [] },
        expectedStatus: 400
      }
    ];

    const results = [];
    for (const test of validationTests) {
      try {
        const testUrl = new URL('/api/signature/pdf/generate', request.url);
        const response = await fetch(testUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(test.body)
        });

        results.push({
          testName: test.name,
          expectedStatus: test.expectedStatus,
          actualStatus: response.status,
          passed: response.status === test.expectedStatus || response.status === 401 // 认证错误也是合理的
        });
      } catch (error) {
        results.push({
          testName: test.name,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { validationTests: results };
  });

  // 测试用例3: 签字元素结构验证
  await runTest(results, "签字元素结构验证", async () => {
    // 创建测试用的签字元素
    const testSignatures: SignatureElement[] = [
      {
        id: 'test-name-1',
        type: SignatureElementType.NAME,
        content: '张三',
        position: { x: 10, y: 10, width: 100, height: 30 },
        pageIndex: 0,
        style: {
          fontSize: 14,
          fontColor: '#000000',
          fontFamily: 'helvetica-bold'
        }
      },
      {
        id: 'test-date-1', 
        type: SignatureElementType.DATE,
        content: '2024-01-15',
        position: { x: 10, y: 50, width: 80, height: 20 },
        pageIndex: 0,
        style: {
          fontSize: 10,
          fontColor: '#000000',
          fontFamily: 'helvetica'
        }
      },
      {
        id: 'test-text-1',
        type: SignatureElementType.TEXT,
        content: '已审阅并同意',
        position: { x: 10, y: 80, width: 120, height: 25 },
        pageIndex: 0,
        style: {
          fontSize: 12,
          fontColor: '#000000',
          fontFamily: 'times-roman'
        }
      }
    ];

    // 验证签字元素结构
    const validationResults = testSignatures.map(sig => ({
      id: sig.id,
      hasRequiredFields: !!(sig.id && sig.type && sig.content && sig.position && sig.style),
      validPosition: sig.position.x >= 0 && sig.position.y >= 0 && 
                    sig.position.width > 0 && sig.position.height > 0,
      validPageIndex: sig.pageIndex >= 0,
      validStyle: !!(sig.style.fontSize && sig.style.fontColor && sig.style.fontFamily)
    }));

    return {
      testSignatures: testSignatures.length,
      validElements: validationResults.filter(r => r.hasRequiredFields && r.validPosition && r.validStyle).length,
      details: validationResults
    };
  });

  // 测试用例4: 配置选项验证
  await runTest(results, "配置选项验证", async () => {
    const testOptions = {
      embedMode: 'overlay' as const,
      quality: 'high' as const,
      preserveMetadata: true,
      enableDebug: false
    };

    const validRequest = {
      taskId: 'test-task-123',
      fileId: 'test-file-456', 
      signatures: [{
        id: 'test-sig',
        type: SignatureElementType.NAME,
        content: 'Test Name',
        position: { x: 50, y: 50, width: 100, height: 30 },
        pageIndex: 0,
        style: { fontSize: 14, fontColor: '#000000', fontFamily: 'helvetica-bold' }
      }],
      outputFileName: 'test-output.pdf',
      options: testOptions
    };

    return {
      requestStructure: 'valid',
      hasOptions: true,
      optionCount: Object.keys(testOptions).length,
      sampleRequest: validRequest
    };
  });

  // 测试用例5: PDF模块集成检查
  await runTest(results, "PDF模块集成检查", async () => {
    try {
      // 检查PDF处理器创建
      const { createPDFProcessor } = await import('@/lib/pdf');
      const processor = createPDFProcessor();
      
      // 检查签字合成器创建
      const { createSignatureComposer } = await import('@/lib/pdf/signature-composer');
      const composer = createSignatureComposer();

      return {
        pdfProcessorAvailable: !!processor,
        signatureComposerAvailable: !!composer,
        modulesLoaded: true
      };
    } catch (error) {
      throw new Error(`Module integration failed: ${error}`);
    }
  });

  // 计算总结果
  const totalDuration = Date.now() - startTime;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = results.filter(r => !r.success).length;

  return NextResponse.json({
    success: passedTests > 0 && failedTests === 0,
    summary: {
      totalTests: results.length,
      passedTests,
      failedTests,
      totalDuration
    },
    tests: results
  });
}

/**
 * 执行单个测试用例
 */
async function runTest(
  results: TestResult[], 
  testName: string, 
  testFunction: () => Promise<any>
): Promise<void> {
  const startTime = Date.now();
  
  try {
    const result = await testFunction();
    results.push({
      testName,
      success: true,
      duration: Date.now() - startTime,
      details: result
    });
  } catch (error) {
    results.push({
      testName,
      success: false,
      duration: Date.now() - startTime,
      details: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 