import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { QuoteData } from "../../../app/document-verification/types";

/**
 * Quote提取提示词 - 基于实际文档格式
 */
const getQuotePrompt = () => `
You are an expert AI agent specializing in OCR and data extraction from Canadian insurance quote documents. Your task is to analyze the provided document and extract information into a structured JSON format.

**DOCUMENT STRUCTURE ANALYSIS:**
The document contains multiple sections:
1. **Vehicle Headers**: "Vehicle X of Y | Private Passenger - YYYY MAKE MODEL (VIN)"
2. **Vehicle Details**: VIN, Annual km, Daily km, Garaging Location, etc.
3. **Driver Lists**: Under each vehicle showing "Driver Name (Role)" where Role is "Prn" (Principal) or "Occ" (Occasional)
4. **Coverage Information**: Insurance coverage details for each vehicle
5. **Individual Driver Pages**: "Driver X of Y | Driver Name" with detailed personal information
6. **Claims/Lapses/Convictions**: Under each driver's detailed page

**CRITICAL EXTRACTION RULES:**

**1. Vehicle Information Extraction:**
- Parse headers like "Vehicle 1 of 2 | Private Passenger - 2025 MERCEDES-BENZ GLE450 4DR AWD"
- Extract: vehicle_id, vehicle_type, vehicle_year, vehicle_make, vehicle_model
- Look for VIN in format like "4JGFBSKBXSB352229"
- Extract Annual km (e.g., "10000"), Daily km (e.g., "5")
- Extract garaging location (e.g., "THORNHILL L3T0G8")
- Extract leased status (Yes/No)

**2. Driver-Vehicle Relationship Mapping:**
- Find driver names under each vehicle section
- Parse role indicators: "(Prn)" = Principal, "(Occ)" = Occasional
- Map each driver to their respective vehicles with correct roles
- Same driver can appear on multiple vehicles with different roles

**3. Driver Personal Information (from individual driver pages):**
- Parse headers like "Driver 1 of 2 | SURNAME, FIRSTNAME"
- Extract birth date, convert MM/DD/YYYY to YYYY-MM-DD
- Extract gender (Male/Female), marital status (Married/Single)
- Extract relationship to applicant (Applicant/Spouse/etc.)
- Extract license information:
  - License number (letter + 14 digits)
  - License province (ON)
  - License class (G)
  - License dates: Date G1, Date G2, Date G (convert to YYYY-MM-DD)
- Extract insurance history:
  - Date Insured (convert to YYYY-MM-DD)
  - Current Carrier name
  - Date with Company (convert to YYYY-MM-DD)
- Extract occupation

**4. Claims Processing:**
- Extract from "Claims" sections under each driver
- Parse description, date, charge status (No = false, Yes = true)
- Extract vehicle involved
- Parse payment amounts: TP/BI$, TP/PD$, AB$, Coll$, Other PD$

**5. Lapses Processing:**
- Extract from "Lapses" sections under each driver
- Parse description, start date, duration in months
- Extract re-instate date

**6. Convictions Processing:**
- Extract from "Convictions" sections under each driver
- Parse description (usually "Speeding")
- Extract date, speed in km/h, severity (Minor/Major)

**7. Coverage Information:**
- Extract from "Coverages" sections under each vehicle
- Standard coverages: Bodily Injury, Property Damage, Direct Compensation, etc.
- Parse coverage amounts and deductibles

**EXPECTED JSON OUTPUT FORMAT:**

{
  "vehicles": [
    {
      "vehicle_id": "1",
      "vehicle_type": "Private Passenger",
      "vin": "EXAMPLE123456789",
      "vehicle_year": "2025",
      "vehicle_make": "SAMPLE_MAKE",
      "vehicle_model": "SAMPLE_MODEL",
      "garaging_location": "SAMPLE_CITY L0T0G0",
      "leased": false,
      "annual_km": "10000",
      "business_km": null,
      "daily_km": "5",
      "purchase_condition": "New",
      "purchase_date": "2025-01-01",
      "km_at_purchase": "100",
      "list_price_new": "50000",
      "purchase_price": null,
      "winter_tires": false,
      "parking_at_night": "Underground Parking",
      "anti_theft": {
        "device_type": null,
        "manufacturer": null,
        "engraving": null
      },
      "drivers": [
        {
          "name": "SAMPLE_LASTNAME, SAMPLE_FIRSTNAME",
          "role": "prn",
          "birth_date": "1990-01-01",
          "marital_status": "Married",
          "gender": "Male",
          "relationship_to_applicant": "Applicant",
          "licence_number": "S00000000000000",
          "licence_province": "ON",
          "occupation": "Sample Occupation",
          "licence_class": "G",
          "date_g": "2018-01-01",
          "date_g2": "2017-01-01",
          "date_g1": "2016-01-01",
          "date_insured": "2018-01-01",
          "current_carrier": "Sample Insurance Company",
          "date_with_company": "2024-01-01",
          "claims": [
            {
              "description": "Sample claim description",
              "date": "2021-01-01",
              "at_fault": false,
              "vehicle_involved": "2025 SAMPLE_MAKE SAMPLE_MODEL",
              "tp_bi": null,
              "tp_pd": "1000",
              "ab": null,
              "coll": null,
              "other_pd": null
            }
          ],
          "lapses": [
            {
              "description": "Sample lapse reason",
              "date": "2023-01-01",
              "duration_months": 2,
              "re_instate_date": "2023-03-01"
            }
          ],
          "convictions": [
            {
              "description": "Speeding",
              "date": "2024-01-01",
              "kmh": "20",
              "severity": "Minor"
            }
          ]
        }
      ],
      "coverages": {
        "bodily_injury": {
          "covered": true,
          "amount": "2,000,000"
        },
        "property_damage": {
          "covered": true,
          "amount": "2,000,000"
        },
        "direct_compensation": {
          "covered": true,
          "deductible": "0"
        },
        "accident_benefits": {
          "covered": true,
          "type": "Standard"
        },
        "loss_or_damage": {
          "collision": {
            "covered": true,
            "deductible": "2,500"
          },
          "comprehensive": {
            "covered": true,
            "deductible": "2,500"
          },
          "all_perils": null
        },
        "uninsured_automobile": {
          "covered": true
        },
        "endorsements": {
          "family_protection": {
            "covered": true,
            "amount": "2,000,000"
          }
        }
      }
    }
  ],
  "driver_limit_notice": null
}

**IMPORTANT NOTES:**
1. **Data Privacy**: Use generic examples like "SAMPLE_LASTNAME, SAMPLE_FIRSTNAME" in the JSON structure
2. **Date Format**: All dates must be in YYYY-MM-DD format
3. **Driver Roles**: Use "prn" for Principal, "occ" for Occasional
4. **Vehicle Relationships**: Same driver can appear on multiple vehicles with different roles
5. **Coverage Parsing**: Extract all coverage types and amounts/deductibles
6. **Claims/Lapses/Convictions**: Group under individual drivers, not vehicles
7. **Backward Compatibility**: Include individual fields for the first vehicle/driver

**PROCESSING STEPS:**
1. Identify all vehicle sections and extract basic vehicle info
2. Map drivers to vehicles with their roles
3. Extract detailed driver information from individual driver pages
4. Parse claims, lapses, and convictions for each driver
5. Extract coverage information for each vehicle
6. Structure data according to the expected JSON format

Return only the raw JSON string without any markdown formatting or explanations.
`;

// 文件类型检测函数
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
  } else if (base64Data.startsWith("iVBORw0KGgo")) {
    return "image/png";
  } else if (base64Data.startsWith("UklGR")) {
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

// AI数据提取函数
async function extractDataWithAI(b64data: string) {
  const model = "google/gemini-2.5-flash-preview";
  
  try {
    const { fileType, fileData } = encodeBase64ToData(b64data);
    console.log("Processing Quote document, file type:", fileType);

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
                      filename: "quote.pdf",
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

    console.log("Sending request to AI API");
    
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await res.json();
    console.log("AI API response received");
    
    return {
      response,
      text: response.choices?.[0]?.message?.content,
    };
    
  } catch (error) {
    console.error("AI extraction error:", error);
    throw error;
  }
}

// JSON解析和数据处理函数
function parseAIResponse(data: string): QuoteData {
  console.log("Parsing AI response:", data);
  
  try {
    // 清理JSON字符串
    let cleanedData = data.trim();
    
    // 移除markdown代码块
    if (cleanedData.startsWith("```json")) {
      cleanedData = cleanedData.substring(7, cleanedData.length - 3).trim();
    }
    if (cleanedData.endsWith("```")) {
      cleanedData = cleanedData.substring(0, cleanedData.length - 3).trim();
    }
    
    // 解析JSON
    const parsed = JSON.parse(cleanedData);
    
    // 数据处理和验证
    const processedData = {
      vehicles: parsed.vehicles || [],
      driver_limit_notice: parsed.driver_limit_notice || null,
      
      // 向后兼容字段 - 从第一个车辆的第一个驾驶员提取
      name: null as string | null,
      licence_number: null as string | null,
      date_of_birth: null as string | null,
      address: null as string | null,
      gender: null as string | null,
      licence_class: null as string | null,
      date_g: null as string | null,
      date_g2: null as string | null,
      date_g1: null as string | null,
      date_insured: null as string | null,
      date_with_company: null as string | null,
      
      // 从第一个车辆提取
      vin: null as string | null,
      vehicle_year: null as string | null,
      vehicle_make: null as string | null,
      vehicle_model: null as string | null,
      garaging_location: null as string | null,
      leased: null as boolean | null,
      annual_mileage: null as string | null,
      commute_distance: null as string | null,
      
      // 空数组 - 现在数据存储在各个驾驶员下
      customer_contact_info: null,
      claims: [],
      convictions: [],
      lapses: []
    };

    // 填充向后兼容字段
    if (processedData.vehicles.length > 0) {
      const firstVehicle = processedData.vehicles[0];
      
      // 车辆信息
      processedData.vin = firstVehicle.vin;
      processedData.vehicle_year = firstVehicle.vehicle_year;
      processedData.vehicle_make = firstVehicle.vehicle_make;
      processedData.vehicle_model = firstVehicle.vehicle_model;
      processedData.garaging_location = firstVehicle.garaging_location;
      processedData.leased = firstVehicle.leased;
      processedData.annual_mileage = firstVehicle.annual_km;
      processedData.commute_distance = firstVehicle.daily_km;
      
      // 驾驶员信息
      if (firstVehicle.drivers && firstVehicle.drivers.length > 0) {
        const firstDriver = firstVehicle.drivers[0];
        processedData.name = firstDriver.name;
        processedData.licence_number = firstDriver.licence_number;
        processedData.date_of_birth = firstDriver.birth_date;
        processedData.gender = firstDriver.gender;
        processedData.licence_class = firstDriver.licence_class;
        processedData.date_g = firstDriver.date_g;
        processedData.date_g2 = firstDriver.date_g2;
        processedData.date_g1 = firstDriver.date_g1;
        processedData.date_insured = firstDriver.date_insured;
        processedData.date_with_company = firstDriver.date_with_company;
      }
    }

    // 确保每个车辆都有必要的数据结构
    processedData.vehicles.forEach((vehicle: QuoteData['vehicles'][0], vehicleIndex: number) => {
      if (!vehicle.vehicle_id) {
        vehicle.vehicle_id = String(vehicleIndex + 1);
      }
      
      if (!vehicle.drivers || !Array.isArray(vehicle.drivers)) {
        vehicle.drivers = [];
      }
      
      // 确保每个驾驶员都有必要的数组
      vehicle.drivers.forEach((driver: QuoteData['vehicles'][0]['drivers'][0], driverIndex: number) => {
        if (!driver.claims || !Array.isArray(driver.claims)) {
          driver.claims = [];
        }
        if (!driver.lapses || !Array.isArray(driver.lapses)) {
          driver.lapses = [];
        }
        if (!driver.convictions || !Array.isArray(driver.convictions)) {
          driver.convictions = [];
        }
        
        // 确保角色正确
        if (!driver.role || (driver.role !== 'prn' && driver.role !== 'occ')) {
          driver.role = driverIndex === 0 ? 'prn' : 'occ';
        }
      });
    });

    console.log("Processed Quote data:", JSON.stringify(processedData, null, 2));
    return processedData;
    
  } catch (error) {
    console.error("JSON parsing error:", error);
    console.error("Raw data:", data);
    throw new Error("Failed to parse AI response as JSON");
  }
}

// 主API处理函数
export async function POST(request: NextRequest) {
  try {
    // 检查用户认证
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

    console.log('开始处理Quote提取请求...');
    console.log(`处理文件: ${fileName}, 类型: ${fileType}, 大小: ${fileSize}`);

    const detectedType = b64dataIsPdf(b64data) ? "pdf" : "image";
    console.log("检测到文件类型:", detectedType);
    
    // 调用AI提取数据
    const aiResult = await extractDataWithAI(b64data);
    
    if (!aiResult.response || aiResult.response.error) {
      throw new Error(`AI API error: ${JSON.stringify(aiResult.response)}`);
    }
    
    if (!aiResult.text) {
      throw new Error('No response text from AI');
    }
    
    const result = parseAIResponse(aiResult.text);
    
    if (!result) {
      throw new Error('Failed to parse AI response');
    }
    
    console.log("Quote extraction successful");
    
    return NextResponse.json({ 
      success: true, 
      data: result,
      metadata: {
        file_name: fileName,
        file_size: fileSize,
        detected_type: detectedType,
        model_used: "google/gemini-2.5-flash-preview",
        vehicles_count: result.vehicles?.length || 0,
        total_drivers: result.vehicles?.reduce((total: number, vehicle: QuoteData['vehicles'][0]) => 
          total + (vehicle.drivers?.length || 0), 0) || 0
      }
    });

  } catch (error) {
    console.error('处理Quote提取时出错:', error);
    
    if (error instanceof Error && error.message.includes('AI API error')) {
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

// 多文件处理API
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized access' 
      }, { status: 401 });
    }

    const body = await request.json();
    const { files } = body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'No files provided' 
      }, { status: 400 });
    }

    console.log(`开始处理Quote多文件提取请求... 共${files.length}个文件`);

    const results: (QuoteData & { file_name: string; file_id: string })[] = [];
    const processingErrors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { b64data, fileName, fileId } = file;
      
      if (!b64data) {
        processingErrors.push(`文件 ${fileName} 缺少文件数据`);
        continue;
      }

      try {
        console.log(`处理文件 ${i + 1}/${files.length}: ${fileName}`);
        
        const detectedType = b64dataIsPdf(b64data) ? "pdf" : "image";
        console.log(`检测到文件类型: ${detectedType}`);
        
        const aiResult = await extractDataWithAI(b64data);
        
        if (!aiResult.response || aiResult.response.error) {
          throw new Error(`AI API error: ${JSON.stringify(aiResult.response)}`);
        }
        
        if (!aiResult.text) {
          throw new Error('No response text from AI');
        }
        
        const result = parseAIResponse(aiResult.text);
        
        if (!result) {
          throw new Error('Failed to parse AI response');
        }
        
        // 添加文件元数据
        const resultWithMetadata = {
          ...result,
          file_name: fileName,
          file_id: fileId
        };
        
        results.push(resultWithMetadata);
        console.log(`成功处理文件: ${fileName}`);
        
        // 延迟避免API限制
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`处理文件 ${fileName} 时出错:`, error);
        processingErrors.push(`文件 ${fileName} 处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    if (results.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: '所有文件处理失败',
        details: processingErrors
      }, { status: 500 });
    }

    // 构建多文件数据结构
    const multiData = {
      ...results[0],
      records: results
    };

    return NextResponse.json({ 
      success: true, 
      data: multiData,
      metadata: {
        total_files: files.length,
        successful_files: results.length,
        failed_files: processingErrors.length,
        processing_errors: processingErrors.length > 0 ? processingErrors : undefined,
        model_used: "google/gemini-2.5-flash-preview"
      }
    });

  } catch (error) {
    console.error('处理Quote多文件提取时出错:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: '多文件处理失败',
      details: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
} 