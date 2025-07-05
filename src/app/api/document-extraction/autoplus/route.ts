import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// 定义Auto+数据类型
interface AutoPlusData {
  name: string | null;
  licence_number: string | null;
  date_of_birth: string | null;
  address: string | null;
  first_insurance_date: string | null;
  policies: Array<{
    policy_period: string;
    company: string;
    status: string;
  }> | null;
  claims: Array<{
    claim_number: string;
    date_of_loss: string;
    at_fault: boolean;
    total_claim_amount: string;
    coverage_types: string | null;
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

// Auto+ 提取提示词
function getAutoPlusPrompt(): string {
  return `You are an expert AI agent specializing in OCR and data extraction from multi-page insurance documents. Your task is to analyze the provided Auto+ Driver Report from Canada and extract information into a structured JSON format. The document may have multiple pages.

**Important Instructions:**
- All field names in the JSON output must be in snake_case.
- All dates must be converted to 'YYYY-MM-DD' format.

**Extraction Plan:**
1. **Page 1 (Summary):** Extract the main driver information, the list of 'Policies', and the summary list of 'Claims'.
2. **Subsequent Pages (Claim Details):** For each claim found in the summary, locate its corresponding detail page (e.g., "Claim #1") and extract the detailed coverage information.
3. **Combine and Structure:** Combine the information from all pages into a single, structured JSON object.

**Fields to Extract:**
- **name**: The full name of the driver. Extract in "LASTNAME, FIRSTNAME" format (e.g., "SMITH, JANE").
- **licence_number**: The Driver's Licence Number. Must be exactly 1 letter followed by 14 digits with NO spaces, hyphens, or other separators (e.g., "A12345678901234"). If you see a licence number with hyphens like "W0418-74109-50504", remove all hyphens and format it as "W04187410950504". Extract only the licence number without any additional text or formatting like "Ontario".
- **date_of_birth**: The driver's date of birth, in YYYY-MM-DD format.
- **address**: The driver's full address. Use \\n for newlines.
- **first_insurance_date**: The earliest start date from all policies in the policy history. Look through all policy periods and find the earliest start date to determine when the driver first purchased insurance. Format as YYYY-MM-DD.
- **policies**: An array of all policy history items from the 'Policies' section.
  - **policy_period**: The start and end date string (e.g., "2017-11-30 to 2020-12-02").
  - **company**: The insurance company name.
  - **status**: The final status (e.g., "Cancelled - non-payment", "Expired").
- **claims**: An array of all claims. You must combine the summary from Page 1 with the details from subsequent pages.
  - **claim_number**: The identifier like "#1", "#2".
  - **date_of_loss**: The date of the loss from the summary, in YYYY-MM-DD format.
  - **at_fault**: A boolean value. If 'At-Fault' is '0%', this must be \`false\`. If it is any other percentage, it must be \`true\`.
  - **total_claim_amount**: The total amount paid for all coverages in this claim combined, formatted as a string (e.g., "$8,500.00").
  - **coverage_types**: The coverage types involved, extracted from the detail page and formatted as a comma-separated string (e.g., "AB, DCPD, COLL"). Only include the main coverage abbreviations like AB, DCPD, COLL, COMP, etc. If no coverage types are found or the detail page is missing, return \`null\`.

**Example of desired JSON output:**
{
  "name": "SMITH, JANE",
  "licence_number": "S55554444433333",
  "date_of_birth": "1992-08-15",
  "address": "456 Oak Ave\\nSOMEWHERE, ON\\nX9Y 8Z7",
  "first_insurance_date": "2021-06-01",
  "policies": [
    {
      "policy_period": "2021-06-01 to 2022-06-01",
      "company": "Fictional Insurance Co",
      "status": "Expired"
    },
    {
      "policy_period": "2022-06-01 to 2023-06-01",
      "company": "Madeup General Insurance",
      "status": "Cancelled - non-payment"
    }
  ],
  "claims": [
    {
      "claim_number": "#1",
      "date_of_loss": "2022-10-20",
      "at_fault": false,
      "total_claim_amount": "$8,500.00",
      "coverage_types": "AB, DCPD"
    }
  ]
}

Return only the raw JSON string. Do not include any extra formatting, markdown, or explanations. If a field is not present in the document, return \`null\` for that field.`;
}

// JSON解析函数
function parseAIResponse(data: string): AutoPlusData | null {
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

// AI数据提取函数
async function extractDataWithAI(b64data: string) {
  const model = "google/gemini-2.5-flash-preview";
  
  try {
    const { fileType, fileData } = encodeBase64ToData(b64data);
    console.debug("fileType", fileType);

    const requestBody = {
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: getAutoPlusPrompt(),
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

    const body = await request.json();
    const { b64data, fileName, fileSize, fileType } = body;
    
    if (!b64data) {
      return NextResponse.json({ 
        success: false,
        error: 'No file data provided' 
      }, { status: 400 });
    }

    console.log('开始处理Auto+提取请求...');
    console.log(`处理文件: ${fileName}, 类型: ${fileType}, 大小: ${fileSize}`);

    const detectedType = b64dataIsPdf(b64data) ? "pdf" : "image";
    console.log("检测到文件类型: " + detectedType);
    
    const aiResult = await extractDataWithAI(b64data);
    
    if (!aiResult.response || aiResult.response.error) {
      throw new Error(`OpenRouter API error: ${JSON.stringify(aiResult.response)}`);
    }
    
    if (!aiResult.text) {
      throw new Error('No response text from AI');
    }
    
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
    console.error('处理Auto+提取时出错:', error);
    
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