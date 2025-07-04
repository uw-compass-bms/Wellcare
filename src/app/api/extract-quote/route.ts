import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * Generate Prompt for Quote extraction
 */
const getQuotePrompt = () => `
You are an expert AI agent specializing in OCR and data extraction from insurance quote documents. Your task is to analyze the provided image of a quote and extract all relevant information into a structured JSON format.

**Important Instructions:**
-   All field names in the JSON output must be in snake_case.
-   All dates must be converted to 'YYYY-MM-DD' format. The source format is likely MM/DD/YYYY.
-   For boolean fields like 'leased' or 'at_fault', extract "Yes" as \`true\` and "No" as \`false\`.
-   If a section (like Claims, Convictions, or Lapses) is not present in the document, return an empty array for that section.
-   **Vehicle Information Extraction**: Look for vehicle information in the header/title section which typically shows format like "Vehicle 1 of 1 | Private Passenger - 2025 AUDI Q5 PROGRESSIV 2.0 TFSI 4DR AWD". From this format, extract:
    - Year: "2025"
    - Make: "AUDI" 
    - Model: "Q5 PROGRESSIV" (include trim/variant if present)
-   **VIN Extraction**: Look for a 17-character alphanumeric code, typically labeled as "VIN" in the vehicle details section.
-   **Garaging Location**: Look for city and postal code information, often shown without spaces (e.g., "UNIONVILLE L6G0H5").

**Fields to Extract:**
-   **Part 1: Driver Information**
    -   **name**: The full name of the driver. Extract in "LASTNAME, FIRSTNAME" format (e.g., "SMITH, JOHN").
    -   **date_of_birth**: The driver's birth date.
    -   **gender**: The driver's gender.
    -   **licence_class**: The driver's licence class.
    -   **date_g**, **date_g2**, **date_g1**: The dates associated with the licence levels.
    -   **licence_number**: The licence number. Must be exactly 1 letter followed by 14 digits with NO spaces, hyphens, or other separators (e.g., "A12345678901234"). If you see a licence number with hyphens like "W0418-74109-50504", remove all hyphens and format it as "W04187410950504". Extract only the licence number without any additional text or formatting.
    -   **date_insured**: The 'Date Insured'.
    -   **date_with_company**: The 'Date with Company'.
-   **Part 2: Vehicle Information**
    -   **vin**: The Vehicle Identification Number (VIN). Look for a field labeled "VIN" or a 17-character alphanumeric code.
    -   **vehicle_year**: The year of the vehicle (e.g., "2023", "2020"). Look for this in the vehicle title section (e.g., "2025 AUDI Q5") or in vehicle details. Extract only the 4-digit year.
    -   **vehicle_make**: The make/brand of the vehicle (e.g., "TOYOTA", "HONDA", "LEXUS", "AUDI"). Look for this in the vehicle title section. Extract in uppercase.
    -   **vehicle_model**: The model of the vehicle (e.g., "RX350", "CAMRY", "ACCORD", "Q5", "Q5 PROGRESSIV"). Look for this in the vehicle title section after the make. Include trim level if present (e.g., "Q5 PROGRESSIV"). Extract the specific model name.
    -   **garaging_location**: The garaging location, combining city and postal code. Look for fields labeled "Garaging Location" or similar.
    -   **leased**: A boolean value indicating if the vehicle is leased. Look for a field labeled "Leased" with "Yes" or "No" values.
    -   **annual_mileage**: The estimated annual driving distance/mileage. Look for fields labeled "Annual km" or similar mileage information.
    -   **commute_distance**: The daily commute distance in kilometers. Look for fields labeled "Daily km" or similar daily driving information.
-   **Part 3: Customer Contact Information** (from top-right corner of the document)
    -   **customer_contact_info**: Extract the complete customer contact information typically found in the top-right corner of the quote document:
        -   **full_address**: The complete customer address including street, city, province, and postal code
        -   **email**: The customer's email address
        -   **phone**: The customer's phone number
-   **Part 4: Claims** (if present)
    -   **description**: The reason for the claim.
    -   **date**: The date of the claim.
    -   **at_fault**: A boolean value. If 'Charge' is 'No', this should be \`false\`. If 'Yes', it should be \`true\`.
    -   **vehicle_involved**: The vehicle involved in the claim.
    -   **tp_pd**, **ab**, **coll**, **other_pd**: The monetary values associated with the claim.
-   **Part 5: Convictions** (if present)
    -   **description**: The reason for the ticket (e.g., "SPEEDING").
    -   **date**: The date of the ticket.
    -   **severity**: The severity of the conviction (e.g., "Minor").
-   **Part 6: Lapses** (if present)
    -   **description**: The exact reason for the lapse as shown in the document (e.g., "Cancelled due to Defaulting Policy Payment", "No Vehicle Hence No Insurance Required").
    -   **start_date**: The "Date" field from the lapses section - this is when the insurance coverage ended/was cancelled.
    -   **end_date**: The "Re-Instate Date" field from the lapses section - this is when insurance coverage was or will be restored. **IMPORTANT**: This date can be in the future (e.g., 2025-06-21). Extract the exact date shown, even if it's a future date.
    -   **duration_months**: The exact number from the "Duration months" field in the lapses section. Do not calculate - use the number provided in the document.

**Example of desired JSON output:**
\`\`\`json
{
  "name": "DOE, JANE",
  "date_of_birth": "1983-03-27",
  "gender": "Female",
  "licence_class": "G",
  "date_g": "2018-02-01",
  "date_g2": "2017-02-01",
  "date_g1": "2016-02-01",
  "licence_number": "J40167900835327",
  "date_insured": "2017-12-19",
  "date_with_company": "2021-09-01",
  "vin": "WA15AAGU2S2017644",
  "vehicle_year": "2025",
  "vehicle_make": "AUDI",
  "vehicle_model": "Q5 PROGRESSIV",
  "garaging_location": "UNIONVILLE L6G0H5",
  "leased": true,
  "annual_mileage": "15000",
  "commute_distance": "5",
  "customer_contact_info": {
    "full_address": "123 Main Street, Toronto, ON M5V 3A8",
    "email": "jane.doe@email.com",
    "phone": "(416) 555-0123"
  },
  "claims": [
    {
      "description": "Non-resp Direct Compensation",
      "date": "2021-11-25",
      "at_fault": false,
      "vehicle_involved": "2025 AUDI Q5 PROGRESSIV 2.0 TFSI 4DR AWD",
      "tp_pd": "4972",
      "ab": "3103",
      "coll": null,
      "other_pd": null
    }
  ],
  "convictions": [
    {
      "description": "SPEEDING 20-29 OVER",
      "date": "2023-05-10",
      "severity": "Minor"
    }
  ],
  "lapses": [
    {
      "description": "Cancelled due to Defaulting Policy Payment",
      "start_date": "2020-12-02",
      "end_date": "2022-07-07",
      "duration_months": 19
    },
    {
      "description": "No Vehicle Hence No Insurance Required",
      "start_date": "2023-06-08",
      "end_date": "2025-06-21",
      "duration_months": 24
    }
  ]
}
\`\`\`
Return only the raw JSON string. Do not include any extra formatting, markdown, or explanations. If a field is not present in the document, return \`null\` for that field.
`;

// 文件类型检测函数
function b64dataIsPdf(b64data: string): boolean {
  return b64data.startsWith("JVBERi0x");
}

// 已移除未使用的函数

function getImageMediaType(base64Data: string): "image/jpeg" | "image/png" | "image/webp" {
  if (base64Data.startsWith("iVBORw0KGgo")) {
    return "image/png";
  } else if (base64Data.startsWith("/9j/")) {
    return "image/jpeg";
  } else if (base64Data.startsWith("UklGR")) {
    return "image/webp";
  }
  return "image/jpeg";
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
    return {
      fileType: "pdf",
      fileData: encodePdfToBase64(base64data),
    };
  } else {
    return {
      fileType: "image",
      fileData: encodeImageToBase64(base64data),
    };
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
              text: getQuotePrompt(),
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

// 已移除未使用的函数

export async function POST(request: NextRequest) {
  try {
    // 用户身份验证
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { b64data, fileName, fileSize, fileType } = body;

    // 基本验证
    if (!b64data || !fileName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: b64data and fileName" },
        { status: 400 }
      );
    }

    // 检查文件大小（50MB限制）
    if (fileSize && fileSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    try {
      console.log(`Processing Quote document: ${fileName}`);

      // 使用与其他API一致的模型和配置
      const aiResult = await extractDataWithAI(b64data);
      
      // 处理API错误和解析结果
      if (!aiResult.response || aiResult.response.error) {
        throw new Error(`OpenRouter API error: ${JSON.stringify(aiResult.response)}`);
      }
      
      if (!aiResult.text) {
        throw new Error('No response text from AI');
      }
      
      const extractedText = aiResult.text;

      // 清理并解析JSON响应
      let cleanedJson = extractedText.trim();
      
      // 移除markdown代码块标记
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.slice(7);
      }
      if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.slice(3);
      }
      if (cleanedJson.endsWith('```')) {
        cleanedJson = cleanedJson.slice(0, -3);
      }
      
      cleanedJson = cleanedJson.trim();

      // 解析提取的数据
      let parsedData;
      try {
        parsedData = JSON.parse(cleanedJson);
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        console.error("Raw extracted text:", extractedText);
        throw new Error("Failed to parse extracted data as JSON");
      }

      // 数据验证和处理
      const processedData = {
        // 基本信息（继承自BaseDocumentData）
        name: parsedData.name || null,
        licence_number: parsedData.licence_number || null,
        date_of_birth: parsedData.date_of_birth || null,
        address: parsedData.customer_contact_info?.full_address || null,

        // Quote特定字段
        gender: parsedData.gender || null,
        licence_class: parsedData.licence_class || null,
        date_g: parsedData.date_g || null,
        date_g2: parsedData.date_g2 || null,
        date_g1: parsedData.date_g1 || null,
        date_insured: parsedData.date_insured || null,
        date_with_company: parsedData.date_with_company || null,
        
        // 车辆信息
        vin: parsedData.vin || null,
        vehicle_year: parsedData.vehicle_year || null,
        vehicle_make: parsedData.vehicle_make || null,
        vehicle_model: parsedData.vehicle_model || null,
        garaging_location: parsedData.garaging_location || null,
        leased: parsedData.leased || null,
        
        // 里程和通勤信息
        annual_mileage: parsedData.annual_mileage || null,
        commute_distance: parsedData.commute_distance || null,
        
        // 客户联系信息
        customer_contact_info: parsedData.customer_contact_info || null,
        
        // 理赔记录
        claims: parsedData.claims || [],
        
        // 违规记录
        convictions: parsedData.convictions || [],
        
        // 保险中断记录
        lapses: parsedData.lapses || []
      };

      console.log("Quote extraction successful for user:", userId);

      // 检测文件类型用于metadata
      const detectedType = b64dataIsPdf(b64data) ? "pdf" : "image";

      return NextResponse.json({
        success: true,
        data: processedData,
        metadata: {
          file_name: fileName,
          file_size: fileSize,
          detected_type: detectedType,
          model_used: "google/gemini-2.5-flash-preview",
          pages_processed: 1
        }
      });

    } catch (fileError) {
      console.error("文件处理错误:", fileError);
      return NextResponse.json(
        { 
          success: false, 
          error: fileError instanceof Error ? fileError.message : "Failed to process file" 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('处理Quote提取时出错:', error);
    
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