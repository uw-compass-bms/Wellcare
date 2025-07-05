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
-   **Multi-Vehicle Support**: Documents may contain multiple vehicles, each identified by "Vehicle X of Y" format.
-   **Multi-Driver Support**: Each vehicle has its own "Drivers" section listing drivers for that specific vehicle.
-   **CRITICAL - Driver Role Detection**: 
    * Each vehicle's "Drivers" section shows drivers with their roles for THAT SPECIFIC VEHICLE
    * Look for "(Prn)" after driver name = Principal driver for that vehicle
    * Look for "(Occ)" after driver name = Occasional driver for that vehicle  
    * THE SAME PERSON CAN HAVE DIFFERENT ROLES ON DIFFERENT VEHICLES
    * Example: "John Smith (Prn)" on Vehicle 1 = Principal on Vehicle 1
    * Example: "John Smith (Occ)" on Vehicle 2 = Occasional on Vehicle 2
    * Extract the role exactly as shown for each vehicle-driver combination
-   **Data Attribution**: Claims, Lapses, and Convictions belong to the specific driver under whose section they appear.
-   **Driver Limit**: Extract maximum 4 drivers. If more than 4 drivers exist, only take the first 4.
-   **Vehicle Information Extraction**: Look for vehicle information in the header/title section which typically shows format like "Vehicle 1 of 1 | Private Passenger - 2025 AUDI Q5 PROGRESSIV 2.0 TFSI 4DR AWD".
-   **VIN Extraction**: Look for a 17-character alphanumeric code, typically labeled as "VIN" in the vehicle details section.
-   **Garaging Location**: Look for city and postal code information, often shown without spaces (e.g., "UNIONVILLE L6G0H5").

**Expected JSON Structure:**

\`\`\`json
{
  "vehicles": [
    {
      "vehicle_id": "1",
      "vehicle_type": "Private Passenger",
      "vin": "Vehicle VIN if available",
      "vehicle_year": "Vehicle year",
      "vehicle_make": "Vehicle make",
      "vehicle_model": "Vehicle model",
      "garaging_location": "Garaging location",
      "leased": false,
      "annual_km": "Annual mileage in km",
      "daily_km": "Daily commute in km",
      "drivers": [
        {
          "name": "LASTNAME, FIRSTNAME",
          "role": "prn",
          "birth_date": "1995-08-25",
          "marital_status": "Married",
          "gender": "Female",
          "relationship_to_applicant": "Applicant",
          "licence_number": "J40017900955826",
          "licence_province": "ON",
          "occupation": "Office Worker",
          "licence_class": "G",
          "date_g": "2019-10-16",
          "date_g2": "2018-10-16",
          "date_g1": "2017-10-16",
          "date_insured": "2019-09-11",
          "current_carrier": "Allstate",
          "date_with_company": "2024-11-12",
          "claims": [
            {
              "description": "Non-resp Direct Compensation",
              "date": "2021-10-08",
              "at_fault": false,
              "vehicle_involved": "2025 MERCEDES-BENZ GLE450 4DR AWD",
              "tp_bi": null,
              "tp_pd": "2420",
              "ab": null,
              "coll": null,
              "other_pd": null
            }
          ],
          "lapses": [
            {
              "description": "No Vehicle Hence No Insurance Required",
              "date": "2023-11-10",
              "duration_months": 0,
              "re_instate_date": "2023-11-12"
            }
          ],
          "convictions": []
        }
      ]
    },
    {
      "vehicle_id": "2", 
      "vehicle_type": "Private Passenger",
      "vin": "Another vehicle VIN",
      "vehicle_year": "2019",
      "vehicle_make": "HONDA",
      "vehicle_model": "CIVIC EX 4DR",
      "garaging_location": "THORNHILL L3T0G8",
      "leased": false,
      "annual_km": "10000",
      "daily_km": "5",
      "drivers": [
        {
          "name": "LASTNAME, FIRSTNAME",
          "role": "occ",
          "birth_date": "1995-08-25",
          "marital_status": "Married",
          "gender": "Female",
          "relationship_to_applicant": "Applicant",
          "licence_number": "J40017900955826",
          "licence_province": "ON",
          "occupation": "Office Worker",
          "licence_class": "G",
          "date_g": "2019-10-16",
          "date_g2": "2018-10-16",
          "date_g1": "2017-10-16",
          "date_insured": "2019-09-11",
          "current_carrier": "Allstate",
          "date_with_company": "2024-11-12",
          "claims": [],
          "lapses": [],
          "convictions": []
        }
      ],
      "coverages": {
        "bodily_injury": {
          "covered": true,
          "amount": "2000000"
        },
        "direct_compensation": {
          "covered": true,
          "deductible": "0"
        },
        "accident_benefits": {
          "covered": true,
          "type": "Standard"
        },
        "uninsured_automobile": {
          "covered": true
        },
        "loss_or_damage": {
          "comprehensive": {
            "covered": true,
            "deductible": "1000"
          },
          "collision": {
            "covered": true,
            "deductible": "1000"
          },
          "all_perils": null
        },
        "endorsements": {
          "rent_or_lease": true,
          "loss_of_use": {
            "covered": true,
            "amount": "2000"
          },
          "liab_to_unowned_veh": {
            "covered": true,
            "amount": "75000"
          },
          "replacement_cost": true,
          "family_protection": {
            "covered": true,
            "amount": "2000000"
          },
          "accident_waiver": true,
          "minor_conviction_protection": true
        }
      }
    }
  ],
  "driver_limit_notice": null
}
\`\`\`

**Extraction Rules:**

1. **Vehicle Structure Recognition**: Each vehicle has its own complete section with vehicle details and drivers list.

2. **Driver Role Extraction - CRITICAL**: 
   - **FOR EACH VEHICLE**: Look at the "Drivers" section under that vehicle
   - **Extract role PER VEHICLE**: Same driver name can appear with different roles on different vehicles
   - **Role Indicators**: 
     * "(Prn)" after name = "prn" (Principal for THIS vehicle)
     * "(Occ)" after name = "occ" (Occasional for THIS vehicle)
   - **Example**:
     * Vehicle 1 Drivers: "John Smith (Prn)", "Jane Doe (Occ)" 
     * Vehicle 2 Drivers: "John Smith (Occ)", "Jane Doe (Prn)"
     * Result: John is Principal on Vehicle 1, Occasional on Vehicle 2

3. **Driver Information Extraction**: For each driver on each vehicle, extract:
   - **name**: Full name in "LASTNAME, FIRSTNAME" format
   - **role**: 'prn' for (Prn) or 'occ' for (Occ) - SPECIFIC TO THIS VEHICLE
   - **birth_date**: Birth date in YYYY-MM-DD format
   - **marital_status**: Marital status (Married, Single, etc.)
   - **gender**: Gender (Male, Female)
   - **relationship_to_applicant**: Relationship to applicant (Applicant, Spouse, etc.)
   - **licence_number**: License number (1 letter + 14 digits, remove all spaces/hyphens)
   - **licence_province**: License province (ON, BC, etc.)
   - **occupation**: Occupation
   - **licence_class**: License class (G, G2, G1, etc.)
   - **date_g**: G license date in YYYY-MM-DD format
   - **date_g2**: G2 license date in YYYY-MM-DD format  
   - **date_g1**: G1 license date in YYYY-MM-DD format
   - **date_insured**: Date insured in YYYY-MM-DD format
   - **current_carrier**: Current insurance carrier
   - **date_with_company**: Date with company in YYYY-MM-DD format

4. **Claims/Lapses/Convictions**: Extract these from the driver's individual section, following same format as before.

5. **Coverage Extraction - CRITICAL**: 
   - **Location**: Look for "Coverages" section under each vehicle
   - **MUTUAL EXCLUSION RULE**: All Perils VS Collision/Comprehensive are MUTUALLY EXCLUSIVE
     * IF document shows "All Perils" → set all_perils.covered=true, collision=null, comprehensive=null
     * IF document shows "Collision" and/or "Comprehensive" → set those accordingly, all_perils=null
   - **Coverage Types**:
     * **Bodily Injury (amount)** → bodily_injury: { covered: true, amount: "2000000" }
     * **Direct Compensation (deductible)** → direct_compensation: { covered: true, deductible: "0" }
     * **Accident Benefits (type)** → accident_benefits: { covered: true, type: "Standard" }
     * **Collision (deductible)** → collision: { covered: true, deductible: "1000" }
     * **Comprehensive (deductible)** → comprehensive: { covered: true, deductible: "1000" }
     * **All Perils (deductible)** → all_perils: { covered: true, deductible: "500" }
     * **Uninsured Automobile** → uninsured_automobile: { covered: true }
   - **Endorsements (附加条款)**:
     * **#5a Rent or Lease** → rent_or_lease: true
     * **#20 Loss of Use (amount)** → loss_of_use: { covered: true, amount: "2000" }
     * **#27 Liab to Unowned Veh. (amount)** → liab_to_unowned_veh: { covered: true, amount: "75000" }
     * **#43 Replacement Cost** → replacement_cost: true
     * **#44 Family Protection (amount)** → family_protection: { covered: true, amount: "2000000" }
     * **Accident Waiver** → accident_waiver: true
     * **Minor Conviction Protection** → minor_conviction_protection: true
   - **Amount vs Deductible**:
     * Numbers in parentheses after coverage names are usually DEDUCTIBLES for collision/comprehensive/all perils
     * Numbers in parentheses after endorsements are usually AMOUNTS (coverage limits)
     * Bodily Injury amounts are coverage limits, not deductibles

6. **Vehicle Information**: Extract complete vehicle details for each vehicle.

7. **Important Notes**:
   - **Same driver can appear on multiple vehicles with different roles**
   - **Extract driver information completely for each vehicle they appear on**
   - **Role is vehicle-specific, not global**
   - Extract data exactly as shown in the document
   - If a field is not present, return null
   - Date formats must be converted to YYYY-MM-DD
   - Boolean fields: Yes = true, No = false

Return only the raw JSON string. Do not include any extra formatting, markdown, or explanations.
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
    const { b64data, fileName, fileSize } = body;

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

      // 数据验证和处理 - 支持新的嵌套结构
      const processedData = {
        // 新的嵌套数据结构
        vehicles: parsedData.vehicles || [],
        driver_limit_notice: parsedData.driver_limit_notice || null,
        
        // 为了向后兼容，保留一些全局字段（从第一个驾驶员提取）
        name: parsedData.vehicles?.[0]?.drivers?.[0]?.name || null,
        licence_number: parsedData.vehicles?.[0]?.drivers?.[0]?.licence_number || null,
        date_of_birth: parsedData.vehicles?.[0]?.drivers?.[0]?.birth_date || null,
        address: null, // 在新结构中不再需要
        
        // 从第一个驾驶员提取（向后兼容）
        gender: parsedData.vehicles?.[0]?.drivers?.[0]?.gender || null,
        licence_class: parsedData.vehicles?.[0]?.drivers?.[0]?.licence_class || null,
        date_g: parsedData.vehicles?.[0]?.drivers?.[0]?.date_g || null,
        date_g2: parsedData.vehicles?.[0]?.drivers?.[0]?.date_g2 || null,
        date_g1: parsedData.vehicles?.[0]?.drivers?.[0]?.date_g1 || null,
        date_insured: parsedData.vehicles?.[0]?.drivers?.[0]?.date_insured || null,
        date_with_company: parsedData.vehicles?.[0]?.drivers?.[0]?.date_with_company || null,
        
        // 从第一个车辆提取（向后兼容）
        vin: parsedData.vehicles?.[0]?.vin || null,
        vehicle_year: parsedData.vehicles?.[0]?.vehicle_year || null,
        vehicle_make: parsedData.vehicles?.[0]?.vehicle_make || null,
        vehicle_model: parsedData.vehicles?.[0]?.vehicle_model || null,
        garaging_location: parsedData.vehicles?.[0]?.garaging_location || null,
        leased: parsedData.vehicles?.[0]?.leased || null,
        
        // 根据用户要求，保留关键字段
        annual_mileage: parsedData.vehicles?.[0]?.annual_km || null,
        commute_distance: parsedData.vehicles?.[0]?.daily_km || null,
        
        // 全局字段现在为空，因为数据已归属到各个驾驶员
        customer_contact_info: null,
        claims: [],
        convictions: [],
        lapses: []
      };

      // 数据验证和清理
      if (processedData.vehicles && processedData.vehicles.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        processedData.vehicles.forEach((vehicle: any) => {
          // 确保每个车辆都有drivers数组
          if (!vehicle.drivers || !Array.isArray(vehicle.drivers)) {
            vehicle.drivers = [];
          }
          
          // 限制最多4个驾驶员
          if (vehicle.drivers.length > 4) {
            vehicle.drivers = vehicle.drivers.slice(0, 4);
            if (!processedData.driver_limit_notice) {
              processedData.driver_limit_notice = "Maximum 4 drivers supported, automatically truncated";
            }
          }
          
          // 处理每个驾驶员
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          vehicle.drivers.forEach((driver: any, driverIndex: number) => {
            // 确保所有必要字段存在
            if (!driver.claims || !Array.isArray(driver.claims)) {
              driver.claims = [];
            }
            if (!driver.lapses || !Array.isArray(driver.lapses)) {
              driver.lapses = [];
            }
            if (!driver.convictions || !Array.isArray(driver.convictions)) {
              driver.convictions = [];
            }
            
            // 设置默认角色
            if (!driver.role) {
              // 如果是第一个驾驶员且没有角色，设置为主驾驶
              if (driverIndex === 0) {
                driver.role = 'prn';
              } else {
                driver.role = 'occ';
              }
            }
            
            // 验证角色只能是prn或occ
            if (driver.role !== 'prn' && driver.role !== 'occ') {
              driver.role = driverIndex === 0 ? 'prn' : 'occ';
            }
          });
        });
      } else {
        // 如果没有vehicles数据，创建空结构
        processedData.vehicles = [];
      }

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