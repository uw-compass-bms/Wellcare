import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { QuoteData } from "../../../app/document-verification/types";

/**
 * Quote提取提示词 - 基于真实文档结构（4页格式）
 */
const getQuotePrompt = () => `
You are an expert AI agent specializing in OCR and data extraction from Canadian insurance quote documents. Your task is to analyze the provided document and extract information into a structured JSON format.

**DOCUMENT STRUCTURE (4-page format):**
Page 1: Vehicle 1 details (basic info, drivers list, coverages)
Page 2: Vehicle 2 details (basic info, drivers list, coverages) 
Page 3: Driver 1 detailed information (personal info, claims, lapses)
Page 4: Driver 2 detailed information (personal info, convictions)

**EXTRACTION INSTRUCTIONS:**

**1. Vehicle Pages Analysis (Pages 1-2):**
- Header format: "Vehicle X of Y | Private Passenger - YYYY MAKE MODEL (VIN)"
- Extract: VIN, vehicle year/make/model, annual km, daily km, garaging location, leased status
- **Vehicle Purchase Information**: Extract Purchase Condition (New/Used/Demo), Purchase Date, List Price New, Winter Tires (Yes/No), Parking at Night
- Under "Drivers" section: Extract driver names with roles "(Prn)" or "(Occ)"
- Under "Coverages" section: Extract coverage types and amounts/deductibles

**2. Driver Pages Analysis (Pages 3-4):**
- Header format: "Driver X of Y | LASTNAME, FIRSTNAME"
- Extract personal information: birth date, marital status, gender, relationship
- Extract license information: license number, province, class, G1/G2/G dates
- Extract insurance history: date insured, current carrier, date with company
- Parse Claims/Lapses/Convictions sections with dates and details

**3. Data Privacy & Formatting:**
- **IMPORTANT**: Use placeholder/anonymized data in the JSON structure below
- Convert all dates to YYYY-MM-DD format
- Use "prn" for Principal drivers, "occ" for Occasional drivers
- Extract exact amounts and deductibles as shown in document

**EXPECTED JSON OUTPUT:**

{
  "vehicles": [
    {
      "vehicle_id": "1",
      "vin": "DOCUMENT_VIN_HERE",
      "vehicle_year": "YYYY",
      "vehicle_make": "MAKE_NAME",
      "vehicle_model": "MODEL_NAME",
      "garaging_location": "CITY_POSTAL_CODE",
      "leased": false,
      "annual_km": "10000",
      "daily_km": "5",
      "purchase_condition": "New",
      "purchase_date": "2019-03-01",
      "list_price_new": "25505",
      "winter_tires": false,
      "parking_at_night": "Underground Parking",
      "drivers": [
        {
          "name": "SAMPLE_LASTNAME, SAMPLE_FIRSTNAME",
          "role": "prn",
          "birth_date": "1990-01-01",
          "gender": "Male",
          "marital_status": "Married",
          "relationship_to_applicant": "Applicant",
          "licence_number": "SAMPLE_LICENSE_123456",
          "licence_province": "ON",
          "licence_class": "G",
          "date_g1": "2016-01-01",
          "date_g2": "2017-01-01",
          "date_g": "2018-01-01",
          "date_insured": "2019-01-01",
          "current_carrier": "Sample Insurance Co",
          "date_with_company": "2024-01-01",
          "occupation": "Sample Occupation",
          "claims": [
            {
              "description": "Sample claim description",
              "date": "2021-01-01",
              "at_fault": false,
              "vehicle_involved": "YYYY MAKE MODEL",
              "tp_pd": "2420",
              "ab": null,
              "coll": null
            }
          ],
          "lapses": [
            {
              "description": "Sample lapse reason",
              "date": "2023-01-01",
              "duration_months": 0,
              "re_instate_date": "2023-01-01"
            }
          ],
          "convictions": []
        },
        {
          "name": "SAMPLE_LASTNAME2, SAMPLE_FIRSTNAME2", 
          "role": "occ",
          "birth_date": "1994-01-01",
          "gender": "Male",
          "marital_status": "Married",
          "relationship_to_applicant": "Spouse",
          "licence_number": "SAMPLE_LICENSE_789012",
          "licence_province": "ON",
          "licence_class": "G",
          "date_g1": "2016-01-01",
          "date_g2": "2017-01-01", 
          "date_g": "2018-01-01",
          "date_insured": "2018-01-01",
          "current_carrier": "Sample Insurance Co",
          "date_with_company": "2024-01-01",
          "occupation": "Sample Occupation",
          "claims": [],
          "lapses": [],
          "convictions": [
            {
              "description": "Speeding",
              "date": "2024-01-01",
              "kmh": "29",
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
          }
        },
        "uninsured_automobile": {
          "covered": true
        }
      }
    }
  ],
  "driver_limit_notice": null
}

**SPECIFIC EXTRACTION RULES:**

1. **Vehicle Information:**
   - Extract VIN exactly as shown (typically 17 characters)
   - Parse vehicle header for year, make, model
   - Find Annual km and Daily km in usage section
   - Extract garaging location (city and postal code)
   - **Purchase Details**: Extract Purchase Condition (New/Used/Demo), Purchase Date (MM/DD/YYYY → YYYY-MM-DD), List Price New (amount only)
   - **Additional Features**: Extract Winter Tires (Yes/No → true/false), Parking at Night (text description)

2. **Driver Assignments:**
   - Match driver names from vehicle pages to detailed driver pages
   - Preserve role assignments (Prn/Occ) for each vehicle
   - Same driver can appear on multiple vehicles with different roles

3. **Personal Information:**
   - Parse birth dates and convert MM/DD/YYYY to YYYY-MM-DD
   - Extract gender (Male/Female), marital status, relationship
   - Parse license information including all G1/G2/G dates

4. **Claims Processing:**
   - Parse description, date, and fault status ("No" = false, "Yes" = true)
   - Extract vehicle involved and payment amounts (TP/PD$, AB$, Coll$)
   - Include all monetary amounts exactly as shown

5. **Lapses and Convictions:**
   - Extract descriptions, dates, and durations
   - For convictions: include speed in km/h and severity level
   - Parse all date fields consistently

6. **Coverage Information:**
   - Extract all coverage types with amounts and deductibles
   - Parse standard coverages: Bodily Injury, Direct Compensation, etc.
   - Include endorsements like Family Protection with amounts

**PROCESSING STEPS:**
1. Identify document pages and their content type (vehicle vs driver)
2. Extract vehicle basic information from vehicle pages
3. Parse driver lists and roles from vehicle pages  
4. Extract detailed driver information from driver pages
5. Match drivers across vehicles and detailed pages
6. Parse coverage information for each vehicle
7. Structure all data according to the JSON format above

**CRITICAL REMINDERS:**
- Use the ACTUAL data from the document but structure it like the anonymized example
- Ensure all dates are in YYYY-MM-DD format
- Preserve exact amounts and deductibles from the document
- Match driver names consistently across vehicle and driver pages
- Include all claims, lapses, and convictions found in the document

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