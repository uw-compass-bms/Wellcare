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
  // 多文件支持字段
  file_name?: string;
  file_id?: string;
}

// 多文件MVR数据类型
interface MvrMultiData extends MvrData {
  records: Array<MvrData>;
}

// 多文件处理请求类型
interface MultiFileRequest {
  files: Array<{
    fileId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    b64data: string;
  }>;
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

// MVR提取提示词 - 专注于status和convictions的准确提取
function getMvrPrompt(): string {
  return `You are an expert OCR and data extraction agent. Analyze the provided document (PDF or image) of an MVR (Motor Vehicle Record) from Ontario, Canada. Extract the following fields and return the data in a structured JSON format.

**🚨 EXTREMELY CRITICAL DATE FORMAT INSTRUCTIONS - READ THIS FIRST! 🚨**
- **FATAL ERROR WARNING**: MVR documents from Ontario use DD/MM/YYYY format (day/month/year) - NOT MM/DD/YYYY!
- **MANDATORY CONVERSION**: You MUST convert ALL dates from DD/MM/YYYY to YYYY-MM-DD format
- **NO EXCEPTIONS**: Every single date field MUST follow this conversion rule
- **WRONG CONVERSION = SYSTEM FAILURE**: Incorrect date conversion will cause critical business rule failures

**DATE CONVERSION EXAMPLES - MEMORIZE THESE:**
- "04/02/2026" (4th February 2026) → "2026-02-04" ✅ CORRECT
- "19/06/1998" (19th June 1998) → "1998-06-19" ✅ CORRECT  
- "15/06/2022" (15th June 2022) → "2022-06-15" ✅ CORRECT
- "31/12/2023" (31st December 2023) → "2023-12-31" ✅ CORRECT
- "05/03/2022" (5th March 2022) → "2022-03-05" ✅ CORRECT

**⚠️ CRITICAL WARNING**: Do NOT confuse with American MM/DD/YYYY format! Ontario MVR uses DD/MM/YYYY!


**Important Instructions:**
- All field names in the JSON output must be in snake_case format
- Return arrays for conditions and convictions with proper structure

**Fields to extract:**
- **licence_number**: The driver's licence number. Must be exactly 1 letter followed by 14 digits with NO spaces, hyphens, or other separators (e.g., "A12345678901234"). If you see a licence number with hyphens like "W0418-74109-50504", remove all hyphens and format it as "W04187410950504".
- **name**: The full name of the driver. **CRITICAL NAME EXTRACTION - READ CAREFULLY**:
  * **Location**: The name appears immediately AFTER the licence number in the MVR document
  * **Source Format**: MVR documents use "LASTNAME,FIRSTNAME" format with a COMMA separator
  * **Format Rules**: 
    - Text BEFORE the comma = LAST NAME (surname/family name)
    - Text AFTER the comma = FIRST NAME (given name)
    - Example: "WU,JINTAO" means WU is the last name, JINTAO is the first name
  * **Output Format**: Extract exactly as shown and output in "LASTNAME,FIRSTNAME" format in ALL CAPS
  * **Examples**: 
    - If you see "WU,JINTAO" → output "WU,JINTAO"
    - If you see "Smith,John" → output "SMITH,JOHN"  
    - If you see "JOHNSON,MARY" → output "JOHNSON,MARY"
  * **CRITICAL**: Do NOT reverse the name order. Do NOT put first name first. Always keep LASTNAME,FIRSTNAME format.
  * **CRITICAL**: The comma separates last name (before comma) from first name (after comma)
- **gender**: The gender of the driver (M/F).
- **address**: The driver's full address. Look for the complete address including city and postal code.
- **expiry_date**: The expiry date of the licence. **🚨 CRITICAL**: Source format is DD/MM/YYYY, MUST convert to YYYY-MM-DD format. Example: "04/02/2026" → "2026-02-04"
- **date_of_birth**: The date of birth of the driver. **🚨 CRITICAL**: Source format is DD/MM/YYYY, MUST convert to YYYY-MM-DD format. Example: "19/06/1998" → "1998-06-19"
- **class**: The class of the licence (e.g., G, G2).
- **status**: The current status of the licence. This is CRITICAL - extract exactly as shown: "LICENCED", "EXPIRED", "SUSPENDED", "UNLICENSED", etc. This field determines license validity.
- **issue_date**: The original issue date of the licence. **🚨 CRITICAL**: Source format is DD/MM/YYYY, MUST convert to YYYY-MM-DD format. Example: "15/06/2022" → "2022-06-15"
- **conditions**: An array of objects for items under "CONDITIONS AND ENDORSEMENTS". Each object should have:
  - date: **🚨 CRITICAL DATE CONVERSION**: If date available (source format DD/MM/YYYY, MUST convert to YYYY-MM-DD format) or null
  - description: The condition description
  **IGNORE the following text patterns:** "REQUIRES CORRECTIVE LENSES", "CORRECTIVE LENSES", "SEARCH SUCCESSFUL - NO PUBLIC RECORD" - these are not actual license conditions.
- **convictions**: An array of objects for items under "CONVICTIONS, DISCHARGES AND OTHER ACTIONS". Each object should have:
  - date: **🚨 CRITICAL DATE CONVERSION**: The conviction date (source format DD/MM/YYYY, MUST convert to YYYY-MM-DD format) - USE THE DATE FROM THE "DATE" COLUMN OR THE DATE LISTED BELOW THE CONVICTION, NOT the date mentioned in the description text
  - description: The conviction description (e.g., "SPEEDING", "DISOBEY LEGAL SIGN", etc.)

**🚨 CRITICAL for Convictions - DATE CONVERSION MANDATORY:**
- For conviction dates, use the date from the structured "DATE" column or the date listed below the conviction entry
- **FATAL ERROR WARNING**: conviction dates are in DD/MM/YYYY format, MUST convert to YYYY-MM-DD
- Do NOT use dates that appear within the description text
- Focus on the actual violation description (e.g., "SPEEDING", "DISOBEY LEGAL SIGN")
- **Example**: If conviction date shows "15/06/2022" → convert to "2022-06-15"

**Example of desired JSON output:**
{
  "licence_number": "D12345678901234",
  "name": "DOE,JOHN",
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

**🚨 FINAL REMINDER - DATE CONVERSION EXAMPLES (MANDATORY TO FOLLOW):**
- MVR shows "04/02/2026" → Output "2026-02-04" (4th February 2026) ✅
- MVR shows "19/06/1998" → Output "1998-06-19" (19th June 1998) ✅  
- MVR shows "15/06/2022" → Output "2022-06-15" (15th June 2022) ✅
- MVR shows "31/12/2023" → Output "2023-12-31" (31st December 2023) ✅
- MVR shows "05/03/2022" → Output "2022-03-05" (5th March 2022) ✅

**⚠️ WRONG DATE CONVERSION WILL CAUSE SYSTEM FAILURE - DOUBLE CHECK ALL DATES!**

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

// 新增：多文件处理端点
export async function PUT(request: NextRequest) {
  try {
    // 检查用户认证状态
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized access' 
      }, { status: 401 });
    }

    // 解析多文件请求
    const body: MultiFileRequest = await request.json();
    const { files } = body;
    
    if (!files || files.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'No files provided' 
      }, { status: 400 });
    }

    console.log(`开始处理多文件MVR提取请求，共 ${files.length} 个文件...`);

    const results: Array<MvrData> = [];
    const errors: Array<{ fileId: string; fileName: string; error: string }> = [];

    // 逐个处理文件
    for (const file of files) {
      try {
        console.log(`处理文件: ${file.fileName} (${file.fileId})`);
        
        // 检测文件类型
        const detectedType = b64dataIsPdf(file.b64data) ? "pdf" : "image";
        console.log(`检测到文件类型: ${detectedType}`);
        
        // 调用AI处理
        const aiResult = await extractDataWithAI(file.b64data);
        
        // 处理API错误
        if (!aiResult.response || aiResult.response.error) {
          throw new Error(`AI处理失败: ${JSON.stringify(aiResult.response)}`);
        }
        
        if (!aiResult.text) {
          throw new Error('AI未返回处理结果');
        }
        
        // 解析AI返回的JSON
        const extractedData = parseAIResponse(aiResult.text);
        
        if (!extractedData) {
          throw new Error('无法解析AI返回的JSON数据');
        }
        
        // 添加文件标识信息
        const recordWithFileInfo: MvrData = {
          ...extractedData,
          file_name: file.fileName,
          file_id: file.fileId
        };
        
        results.push(recordWithFileInfo);
        console.log(`文件 ${file.fileName} 处理成功`);
        
        // 添加延时以避免API限制
        if (files.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`处理文件 ${file.fileName} 时出错:`, error);
        errors.push({
          fileId: file.fileId,
          fileName: file.fileName,
          error: error instanceof Error ? error.message : '处理失败'
        });
      }
    }

    // 构建多文件数据结构
    const multiData: MvrMultiData = {
      // 使用第一个成功记录的基本信息作为默认值
      ...(results[0] || {
        licence_number: null,
        name: null,
        gender: null,
        date_of_birth: null,
        address: null,
        issue_date: null,
        expiry_date: null,
        class: null,
        status: null,
        conditions: null,
        convictions: null
      }),
      records: results
    };

    const response = {
      success: true,
      data: multiData,
      metadata: {
        total_files: files.length,
        successful_files: results.length,
        failed_files: errors.length,
        model_used: "google/gemini-2.5-flash-preview",
        processing_time: new Date().toISOString(),
        ...(errors.length > 0 && { errors })
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('多文件MVR处理出错:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: '多文件处理失败，请检查文件格式',
      details: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
} 