import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ApplicationData } from '../../app/document-verification/types';

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

// Application 提取提示词
function getApplicationPrompt(): string {
  return `你是一个专门从Ontario汽车保险申请表(OAF 1)中提取信息的AI专家。你需要分析提供的文档并提取结构化的JSON数据。

**重要说明：**
- 跳过第1页和第2页，从第3页开始提取信息
- 所有字段名必须使用snake_case格式
- 所有日期必须转换为'YYYY-MM-DD'格式
- 如果某个字段在文档中不存在，返回null
- 支持多车辆多驾驶员提取

**提取字段清单：**

### 1. 申请人基本信息 (从第3页开始)
- **name**: 申请人全名，从"Applicant's Name & Primary Address"区域提取
- **licence_number**: 驾照号码
- **date_of_birth**: 出生日期，格式YYYY-MM-DD
- **address**: 完整地址，使用\\n分隔多行
- **phone**: 电话号码
- **lessor_info**: 如果适用，提取Lessor信息

### 2. 保单信息
- **effective_date**: 生效日期，格式YYYY-MM-DD
- **expiry_date**: 到期日期，格式YYYY-MM-DD

### 3. 多车辆信息
- **vehicles**: 车辆数组，每个车辆包含：
  - **vehicle_id**: 车辆序号 (Auto 1, Auto 2, etc.)
  - **vehicle_year**: 车辆年份
  - **vehicle_make**: 车辆厂牌(Make)
  - **vehicle_model**: 车辆型号(Model)
  - **vin**: VIN号码，从"Vehicle Identification No."字段提取
  - **lienholder_info**: Lienholder Name & Postal Address下方的信息
  - **vehicle_ownership**: 判断是"lease"还是"owned"，通过Lienholder信息和相关标记判断
  - **annual_mileage**: 年驾驶里程数
  - **commute_distance**: 通勤单程距离(公里数)
  - **automobile_use_details**: Automobile Use部分的详细信息
  
  - **coverages**: 从"Insurance Coverages Applied For"表格中提取每台车的保险保障信息
    - **liability**: 
      - **bodily_injury**: { amount: "保额", premium: "保费" }
      - **property_damage**: { amount: "保额", premium: "保费" }
    - **accident_benefits**:
      - **standard**: { amount: "保额", premium: "保费" }
      - **enhanced**: { 各种增强选项: true/false }
    - **uninsured_automobile**: { covered: true/false, amount: "保额", premium: "保费" }
    - **direct_compensation**: { covered: true/false, deductible: "垫底费", premium: "保费" }
    - **loss_or_damage**:
      - **comprehensive**: { covered: true/false, deductible: "垫底费", premium: "保费" }
      - **collision**: { covered: true/false, deductible: "垫底费", premium: "保费" }
      - **all_perils**: { covered: true/false, deductible: "垫底费", premium: "保费" }
      - **specified_perils**: { covered: true/false, deductible: "垫底费", premium: "保费" }
    - **policy_change_forms**:
      - **family_protection**: { covered: true/false, deductible: "垫底费", premium: "保费" }
    - **total_premium**: 每台车的保费合计

### 4. 多驾驶员信息
- **drivers**: 驾驶员数组，每个驾驶员包含：
  - **name**: 姓名
  - **licence_number**: 驾照号码  
  - **date_of_birth**: 出生日期，格式YYYY-MM-DD
  - **gender**: 性别
  - **marital_status**: 婚姻状态
  - **first_licensed_date**: 首次获得驾照日期，从"First Licensed in Canada or U.S."部分提取

### 5. 备注信息 - 重要！
- **remarks**: 完整提取"Remarks - Use this space if you have further details"下方的所有内容
  - **注意**: 这部分内容可能跨页，确保提取所有相关信息
  - **包括**: 所有驾驶员的Graduated Licensing信息、邮箱、保险历史等所有内容
  - **格式**: 使用\\n分隔不同行的内容

### 6. 支付信息
- **payment_info**:
  - **annual_premium**: 年保费总额，从"Total Estimated Cost"提取
  - **monthly_payment**: 月供金额，从"Amount of Each Instalment"提取
  - **payment_type**: 根据支付方式设置为"annual"或"monthly"

### 7. 签名确认
- **signatures**:
  - **applicant_signed**: 申请人是否有签名（true/false）
  - **applicant_signature_date**: 申请人签名日期，格式YYYY-MM-DD
  - **broker_signed**: 经纪人是否有签名（true/false）
  - **broker_signature_date**: 经纪人签名日期，格式YYYY-MM-DD

**JSON输出格式示例：**
{
  "name": "PANG, XIAOCHUAN",
  "licence_number": "J40017900955826",
  "date_of_birth": "1995-08-26",
  "address": "205-12 GANDHI LANE\\nTHORNHILL, ON\\nL3T 0G8",
  "phone": "647-870-8267",
  "lessor_info": null,
  "effective_date": "2025-03-20",
  "expiry_date": "2026-03-20",
  "vehicles": [
    {
      "vehicle_id": "Auto 1",
      "vehicle_year": "2025",
      "vehicle_make": "MERCEDES-BENZ",
      "vehicle_model": "GLE450 4DR AWD",
      "vin": "4JGFB8FB5KA123456",
      "lienholder_info": "Mercedes-Benz Financial Servic 2580 Matheson Blvd East Suite 500 Mississauga ON L4W 0A5",
      "vehicle_ownership": "lease",
      "annual_mileage": "10000",
      "commute_distance": "5",
      "automobile_use_details": null,
      "coverages": {
        "liability": {
          "bodily_injury": {
            "amount": "2000000",
            "premium": "491"
          },
          "property_damage": {
            "amount": "2000000",
            "premium": "77"
          }
        },
        "accident_benefits": {
          "standard": {
            "amount": "590",
            "premium": "590"
          },
          "enhanced": null
        },
        "uninsured_automobile": {
          "covered": true,
          "amount": "27",
          "premium": "27"
        },
        "direct_compensation": {
          "covered": true,
          "deductible": "0",
          "premium": "1507"
        },
        "loss_or_damage": {
          "comprehensive": {
            "covered": true,
            "deductible": "2500",
            "premium": "655"
          },
          "collision": {
            "covered": true,
            "deductible": "2500",
            "premium": "1746"
          },
          "all_perils": null,
          "specified_perils": null
        },
        "policy_change_forms": {
          "family_protection": {
            "covered": true,
            "deductible": "15",
            "premium": "15"
          }
        },
        "total_premium": "5093"
      }
    },
    {
      "vehicle_id": "Auto 2",
      "vehicle_year": "2019",
      "vehicle_make": "HONDA",
      "vehicle_model": "CIVIC EX 4DR",
      "vin": "19XFC2F75KE987654",
      "lienholder_info": null,
      "vehicle_ownership": "owned",
      "annual_mileage": "10000",
      "commute_distance": "5",
      "automobile_use_details": null,
      "coverages": {
        "liability": {
          "bodily_injury": {
            "amount": "2000000",
            "premium": "407"
          },
          "property_damage": {
            "amount": "2000000",
            "premium": "45"
          }
        },
        "accident_benefits": {
          "standard": {
            "amount": "1033",
            "premium": "1033"
          },
          "enhanced": null
        },
        "uninsured_automobile": {
          "covered": true,
          "amount": "47",
          "premium": "47"
        },
        "direct_compensation": {
          "covered": true,
          "deductible": "0",
          "premium": "665"
        },
        "loss_or_damage": {
          "comprehensive": {
            "covered": true,
            "deductible": "2500",
            "premium": "129"
          },
          "collision": {
            "covered": true,
            "deductible": "2500",
            "premium": "987"
          },
          "all_perils": null,
          "specified_perils": null
        },
        "policy_change_forms": null,
        "total_premium": "3628"
      }
    }
  ],
  "drivers": [
    {
      "name": "Youyue Ji",
      "licence_number": "J40017900955826",
      "date_of_birth": "1995-08-26",
      "gender": "F",
      "marital_status": "M",
      "first_licensed_date": "2017-10-01"
    },
    {
      "name": "Xiaochuan Pang",
      "licence_number": "P04187890440206",
      "date_of_birth": "1994-02-06",
      "gender": "M",
      "marital_status": "M",
      "first_licensed_date": "2016-01-01"
    }
  ],
  "remarks": "Applicant Email - youyueyue@gmail.com\\nDrv. No. 1 - Graduated Licensing - G - 2017/10/16\\nDrv. No. 1 - Graduated Licensing - G1 - 2017/10/16\\nDrv. No. 1 - Graduated Licensing - G2 - 2018/10/16\\nDrv. No. 2 - Graduated Licensing - G - 2016/01/04\\nDrv. No. 2 - Graduated Licensing - G1 - 2016/01/04\\nDrv. No. 2 - Graduated Licensing - G2 - 2017/01/04\\nGeneral - OPCF 43 declined (Waiver of Depreciation). No compensation for depreciation in case of total loss.\\nOPCF 20 declined (Loss of Use). No coverage for rental car expenses if vehicle is unavailable due to accident.",
  "payment_info": {
    "annual_premium": "8721.00",
    "monthly_payment": null,
    "payment_type": "annual"
  },
  "signatures": {
    "applicant_signed": true,
    "applicant_signature_date": "2024-01-01",
    "broker_signed": true,
    "broker_signature_date": "2024-01-01"
  }
}

只返回原始JSON字符串，不要包含任何额外的格式、markdown或解释。如果某个字段在文档中不存在，返回null。`;
}

// JSON解析函数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAIResponse(data: string): any {
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
              text: getApplicationPrompt(),
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

    console.log('开始处理Application提取请求...');
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
    
    // 数据处理和向后兼容
    const processedData: ApplicationData = {
      // 新的嵌套数据结构
      vehicles: result.vehicles || [],
      drivers: result.drivers || [],
      remarks: result.remarks || null,
      phone: result.phone || null,
      lessor_info: result.lessor_info || null,
      effective_date: result.effective_date || null,
      expiry_date: result.expiry_date || null,
      payment_info: result.payment_info || null,
      signatures: result.signatures || null,
      
      // 从第一个车辆提取的向后兼容字段
      name: result.name || null,
      licence_number: result.licence_number || null,
      date_of_birth: result.date_of_birth || null,
      address: result.address || null,
      vehicle_year: result.vehicles?.[0]?.vehicle_year || null,
      vehicle_make: result.vehicles?.[0]?.vehicle_make || null,
      vehicle_model: result.vehicles?.[0]?.vehicle_model || null,
      vin: result.vehicles?.[0]?.vin || null,
      lienholder_info: result.vehicles?.[0]?.lienholder_info || null,
      vehicle_ownership: result.vehicles?.[0]?.vehicle_ownership || null,
      annual_mileage: result.vehicles?.[0]?.annual_mileage || null,
      commute_distance: result.vehicles?.[0]?.commute_distance || null,
      automobile_use_details: result.vehicles?.[0]?.automobile_use_details || null,
      
      // 向后兼容的旧结构保险保障信息
      insurance_coverages: result.vehicles?.[0]?.coverages ? {
        liability_amount: result.vehicles[0].coverages.liability?.bodily_injury?.amount || null,
        loss_or_damage: {
          comprehensive: result.vehicles[0].coverages.loss_or_damage?.comprehensive ? {
            covered: result.vehicles[0].coverages.loss_or_damage.comprehensive.covered,
            deductible: result.vehicles[0].coverages.loss_or_damage.comprehensive.deductible
          } : null,
          collision: result.vehicles[0].coverages.loss_or_damage?.collision ? {
            covered: result.vehicles[0].coverages.loss_or_damage.collision.covered,
            deductible: result.vehicles[0].coverages.loss_or_damage.collision.deductible
          } : null,
          all_perils: result.vehicles[0].coverages.loss_or_damage?.all_perils ? {
            covered: result.vehicles[0].coverages.loss_or_damage.all_perils.covered,
            deductible: result.vehicles[0].coverages.loss_or_damage.all_perils.deductible,
            premium: result.vehicles[0].coverages.loss_or_damage.all_perils.premium
          } : null
        }
      } : null,
      
      // 向后兼容的旧结构附加条款
      policy_change_forms: result.vehicles?.[0]?.coverages?.policy_change_forms ? {
        loss_of_use: false, // 根据需要设置
        liab_to_unowned_veh: false, // 根据需要设置
        limited_waiver: false, // 根据需要设置
        rent_or_lease: false, // 根据需要设置
        accident_waiver: false, // 根据需要设置
        minor_conviction_protection: false // 根据需要设置
      } : null
    };
    
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

  } catch (error) {
    console.error('处理Application提取时出错:', error);
    
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