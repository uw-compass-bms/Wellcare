import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// 定义MVR数据类型 - 与前端保持一致
interface MvrData {
  licence_number: string | null;
  name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  class: string | null;
  status: string | null;
  conditions: Array<{
    date: string | null;
    description: string;
  }> | null;
  convictions: Array<{
    date: string | null;
    description: string;
  }> | null;
}

// 文件类型检测和编码函数
function b64dataIsPdf(b64data: string): boolean {
  return b64data.startsWith("JVBERi");
}

function b64dataIsImage(b64data: string): boolean {
  return (
    b64data.startsWith("/9j/") ||
    b64data.startsWith("iVBORw0KGgo") ||
    b64data.startsWith("UklGR")
  );
}

function getImageMediaType(base64Data: string): "image/jpeg" | "image/png" | "image/webp" {
  if (base64Data.startsWith("/9j/")) {
    return "image/jpeg";
  }
  else if (base64Data.startsWith("iVBORw0KGgo")) {
    return "image/png";
  }
  else if (base64Data.startsWith("UklGR")) {
    return "image/webp";
  }
  console.log("base64Data", base64Data.slice(0, 50));
  throw new Error("Unsupported image type");
}

function encodeImageToBase64(base64data: string): string {
  const mediaType = getImageMediaType(base64data);
  return `data:${mediaType};base64,${base64data}`;
}

function encodePdfToBase64(base64data: string): string {
  return `data:application/pdf;base64,${base64data}`;
}

function encodeBase64ToData(base64data: string): {
  fileType: "pdf" | "image";
  fileData: string;
} {
  if (b64dataIsPdf(base64data)) {
    return { fileType: "pdf", fileData: encodePdfToBase64(base64data) };
  } else if (b64dataIsImage(base64data)) {
    return { fileType: "image", fileData: encodeImageToBase64(base64data) };
  } else {
    throw new Error("Unsupported file type");
  }
}

// MVR提取提示词 - 更新为新的数据结构
function getMvrPrompt(): string {
  return `You are an expert OCR and data extraction agent. Analyze the provided document (PDF or image) of an MVR (Motor Vehicle Record) from Ontario, Canada. Extract the following fields and return the data in a structured JSON format.

**Important Instructions:**
- All field names in the JSON output must be in snake_case format
- All dates must be converted to 'YYYY-MM-DD' format. If a date is DD/MM/YYYY, convert it
- Return arrays for conditions and convictions with proper structure

**Fields to extract:**
- **licence_number**: The driver's licence number. Must be exactly 1 letter followed by 14 digits with NO spaces, hyphens, or other separators (e.g., "A12345678901234"). If you see a licence number with hyphens like "W0418-74109-50504", remove all hyphens and format it as "W04187410950504".
- **name**: The full name of the driver. Extract in "LASTNAME, FIRSTNAME" format (e.g., "SMITH, JOHN").
- **gender**: The gender of the driver (M/F).
- **address**: The driver's full address. Look for the complete address including city and postal code.
- **expiry_date**: The expiry date of the licence, in YYYY-MM-DD format.
- **date_of_birth**: The date of birth of the driver, in YYYY-MM-DD format.
- **class**: The class of the licence (e.g., G, G2).
- **status**: The current status of the licence.
- **issue_date**: The original issue date of the licence, in YYYY-MM-DD format.
- **conditions**: An array of objects for items under "CONDITIONS AND ENDORSEMENTS". Each object should have:
  - date: The date if available (YYYY-MM-DD format) or null
  - description: The condition description
- **convictions**: An array of objects for items under "CONVICTIONS, DISCHARGES AND OTHER ACTIONS". Each object should have:
  - date: The conviction date (YYYY-MM-DD format) or null
  - description: The conviction description

**Example of desired JSON output:**
{
  "licence_number": "D12345678901234",
  "name": "DOE, JOHN",
  "gender": "M",
  "address": "123 Main Street\\nTORONTO, ON\\nL4S 1V2",
  "expiry_date": "2028-12-31",
  "date_of_birth": "1980-01-01",
  "class": "G",
  "status": "LICENCED",
  "issue_date": "2015-10-05",
  "conditions": [
    { "date": null, "description": "CORRECTIVE LENSES" }
  ],
  "convictions": [
    { "date": "2022-06-15", "description": "SPEEDING - 80 KM/H in a 60 KM/H ZONE" }
  ]
}

If no conditions or convictions are found, return empty arrays []. If a field is not found, return null for that field. Return only the JSON string, with no additional formatting or markdown.`;
}

// JSON解析函数
function parseAIResponse(data: string): MvrData | null {
  console.log("parseAIResponse", data);
  try {
    if (typeof data === "string") {
      if (data.startsWith("```json")) {
        data = data.substring(7, data.length - 3).trim();
      }
      if (data.endsWith("```")) {
        data = data.substring(0, data.length - 3).trim();
      }
      return JSON.parse(data);
    } else {
      return data;
    }
  } catch (error) {
    console.error("parseAIResponse error", error);
    return null;
  }
}

// AI数据提取函数 - 基于成功项目的实现
async function extractDataWithAI(b64data: string) {
  const model = "google/gemini-2.5-flash-preview";
  
  try {
    // 使用文件检测逻辑
    const { fileType, fileData } = encodeBase64ToData(b64data);
    console.debug("fileType", fileType);

    // 构建请求格式
    const requestBody = {
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: getMvrPrompt(),
            },
            ...(fileType === "pdf"
              ? [
                  {
                    type: "file",
                    file: {
                      filename: "document.pdf",
                      file_data: fileData,
                    },
                  },
                ]
              : []),
            ...(fileType === "image"
              ? [
                  {
                    type: "image_url",
                    image_url: {
                      url: fileData,
                    },
                  },
                ]
              : []),
          ],
        },
      ],
      response_format: { type: "json_object" },
    };

    console.debug("requestBody", requestBody.messages[0].content[1]);
    
    // API调用
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await res.json();
    console.debug("response", response);
    
    return {
      response,
      text: response.choices?.[0]?.message?.content,
    };
    
  } catch (error) {
    console.error("extractDataWithAI error:", error);
    throw error;
  }
}

// 主API路由处理
export async function POST(request: NextRequest) {
  try {
    // 检查用户认证状态
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized access' 
      }, { status: 401 });
    }

    // 🔑 支持JSON请求格式
    const body = await request.json();
    const { b64data, fileName, fileSize, fileType } = body;
    
    if (!b64data) {
      return NextResponse.json({ 
        success: false,
        error: 'No file data provided' 
      }, { status: 400 });
    }

    console.log('开始处理MVR提取请求...');
    console.log(`处理文件: ${fileName}, 类型: ${fileType}, 大小: ${fileSize}`);

    const detectedType = b64dataIsPdf(b64data) ? "pdf" : "image";
    console.log("检测到文件类型: " + detectedType);
    
    // 调用AI处理
    const aiResult = await extractDataWithAI(b64data);
    
    // 处理API错误和解析结果
    if (!aiResult.response || aiResult.response.error) {
      throw new Error(`OpenRouter API error: ${JSON.stringify(aiResult.response)}`);
    }
    
    if (!aiResult.text) {
      throw new Error('No response text from AI');
    }
    
    // 解析AI返回的JSON
    const result = parseAIResponse(aiResult.text);
    
    if (!result) {
      throw new Error('Failed to parse AI response as JSON');
    }
    
    return NextResponse.json({ 
      success: true, 
      data: result,
      metadata: {
        file_name: fileName,
        file_size: fileSize,
        detected_type: detectedType,
        model_used: "google/gemini-2.5-flash-preview",
        pages_processed: 1
      }
    });

  } catch (error) {
    console.error('处理MVR提取时出错:', error);
    
    // 更详细的错误分类
    if (error instanceof Error && error.message.includes('OpenRouter API error')) {
      return NextResponse.json({ 
        success: false, 
        error: 'AI服务暂时不可用，请稍后重试',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: '文件处理失败，请检查文件格式',
      details: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
} 