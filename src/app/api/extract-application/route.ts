import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// 定义Application数据类型
interface ApplicationData {
  // 基本申请信息
  name: string | null;
  licence_number: string | null;
  date_of_birth: string | null;
  address: string | null;
  phone: string | null;
  lessor_info: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  
  // 车辆信息
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vin: string | null;
  lienholder_info: string | null;
  vehicle_ownership: 'lease' | 'owned' | null;
  
  // 使用信息
  estimated_annual_driving_distance: string | null;
  commute_distance: string | null;
  automobile_use_details: string | null;
  
  // 驾驶员信息
  drivers: Array<{
    name: string;
    licence_number: string;
    date_of_birth: string;
    gender: string | null;
    marital_status: string | null;
    first_licensed_date: string | null;
  }> | null;
  
  // 保险保障信息
  insurance_coverages: {
    liability_amount: string | null;
    loss_or_damage: {
      comprehensive: {
        covered: boolean;
        deductible: string | null;
      } | null;
      collision: {
        covered: boolean;
        deductible: string | null;
      } | null;
      all_perils: {
        covered: boolean;
        deductible: string | null;
        premium: string | null;
      } | null;
    } | null;
  } | null;
  
  // 附加条款
  policy_change_forms: {
    loss_of_use: boolean | null;
    liab_to_unowned_veh: boolean | null;
    limited_waiver: boolean | null;
    rent_or_lease: boolean | null;
    accident_waiver: boolean | null;
    minor_conviction_protection: boolean | null;
  } | null;
  
  // 备注信息
  remarks: string | null;
  
  // 支付信息
  payment_info: {
    annual_premium: string | null;
    monthly_payment: string | null;
    payment_type: 'annual' | 'monthly' | null;
  } | null;
  
  // 签名确认
  signatures: {
    applicant_signed: boolean | null;
    applicant_signature_date: string | null;
    broker_signed: boolean | null;
    broker_signature_date: string | null;
  } | null;
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

// Application 提取提示词
function getApplicationPrompt(): string {
  return `你是一个专门从Ontario汽车保险申请表(OAF 1)中提取信息的AI专家。你需要分析提供的文档并提取结构化的JSON数据。

**重要说明：**
- 跳过第1页和第2页，从第3页开始提取信息
- 所有字段名必须使用snake_case格式
- 所有日期必须转换为'YYYY-MM-DD'格式
- 如果某个字段在文档中不存在，返回null

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

### 3. 车辆信息
- **vehicle_year**: 车辆年份
- **vehicle_make**: 车辆厂牌(Make)
- **vehicle_model**: 车辆型号(Model)
- **vin**: VIN号码，从"Vehicle Identification No."字段提取
- **lienholder_info**: Lienholder Name & Postal Address下方的信息
- **vehicle_ownership**: 判断是"lease"还是"owned"，通过Lienholder信息和相关标记判断

### 4. 使用信息
- **estimated_annual_driving_distance**: 年驾驶里程数
- **commute_distance**: 通勤单程距离(公里数)
- **automobile_use_details**: Automobile Use部分的详细信息

### 5. 驾驶员信息
- **drivers**: 驾驶员数组，每个驾驶员包含：
  - **name**: 姓名
  - **licence_number**: 驾照号码
  - **date_of_birth**: 出生日期，格式YYYY-MM-DD
  - **gender**: 性别
  - **marital_status**: 婚姻状态
  - **first_licensed_date**: 首次获得驾照日期，从"First Licensed in Canada or U.S."部分提取

### 6. 保险保障信息
- **insurance_coverages**:
  - **liability_amount**: 第三者责任险金额（注意：1000表示100万）
  - **loss_or_damage**: 损失或损害保障
    - **comprehensive**: 如果有Deductible，设置covered=true，否则covered=false
      - **covered**: 是否承保
      - **deductible**: 免赔额，必须是百位整数(500, 1000, 2000, 5000等)，如果不是请四舍五入到最近的百位数
    - **collision**: 如果有Deductible，设置covered=true，否则covered=false
      - **covered**: 是否承保
      - **deductible**: 免赔额，必须是百位整数(500, 1000, 2000, 5000等)，如果不是请四舍五入到最近的百位数
    - **all_perils**: 如果有Deductible和Premium且Premium>0，设置covered=true，否则covered=false
      - **covered**: 是否承保
      - **deductible**: 免赔额
      - **premium**: 保费

### 7. 附加条款 (Policy Change Forms部分)
- **policy_change_forms**:
  - **loss_of_use**: #20 Loss of Use条款是否存在 (true/false)
  - **liab_to_unowned_veh**: #27 Liab to Unowned Veh.条款是否存在 (true/false)
  - **limited_waiver**: #43a Limited Waiver条款是否存在 (true/false)
  - **rent_or_lease**: #5a Rent or Lease条款是否存在 (true/false)
  - **accident_waiver**: Accident Waiver条款是否存在 (true/false)
  - **minor_conviction_protection**: Minor Conviction Protection条款是否存在 (true/false)

### 8. 备注信息
- **remarks**: Remarks - Use this space if you have further details下方的所有内容

### 9. 支付信息
- **payment_info**:
  - **annual_premium**: 年保费总额，从"Total Estimated Cost"提取
  - **monthly_payment**: 月供金额，从"Amount of Each Instalment"提取
  - **payment_type**: 根据支付方式设置为"annual"或"monthly"

### 10. 签名确认
- **signatures**:
  - **applicant_signed**: 申请人是否有签名（true/false）
  - **applicant_signature_date**: 申请人签名日期，格式YYYY-MM-DD
  - **broker_signed**: 经纪人是否有签名（true/false）
  - **broker_signature_date**: 经纪人签名日期，格式YYYY-MM-DD

**JSON输出格式示例：**
{
  "name": "SMITH, JOHN",
  "licence_number": "S12345678901234",
  "date_of_birth": "1990-05-15",
  "address": "123-456 MAIN STREET\\nTORONTO, ON\\nM1A 2B3",
  "phone": "416-123-4567",
  "lessor_info": null,
  "effective_date": "2024-03-01",
  "expiry_date": "2025-03-01",
  "vehicle_year": "2022",
  "vehicle_make": "TOYOTA",
  "vehicle_model": "CAMRY SE",
  "vin": "1A2B3C4D5E6F7G8H9",
  "lienholder_info": "Sample Leasing Company 456 Business Rd Toronto ON M2B 3C4",
  "vehicle_ownership": "lease",
  "estimated_annual_driving_distance": "15000",
  "commute_distance": "10",
  "automobile_use_details": null,
  "drivers": [
    {
      "name": "John Smith",
      "licence_number": "S12345678901234",
      "date_of_birth": "1990-05-15",
      "gender": "M",
      "marital_status": "M",
      "first_licensed_date": "2008-06-01"
    }
  ],
      "insurance_coverages": {
      "liability_amount": "1000000",
      "loss_or_damage": {
        "comprehensive": {
          "covered": true,
          "deductible": "500"
        },
        "collision": {
          "covered": true,
          "deductible": "500"
        },
        "all_perils": null
      }
    },
    "policy_change_forms": {
      "loss_of_use": true,
      "liab_to_unowned_veh": true,
      "limited_waiver": false,
      "rent_or_lease": false,
      "accident_waiver": false,
      "minor_conviction_protection": true
    },
  "remarks": "Applicant Email - example@email.com\\nDrv. No. 1 - Graduated Licensing - G - 2010/06/15\\nDrv. No. 1 - Graduated Licensing - G1 - 2008/06/01\\nDrv. No. 1 - Graduated Licensing - G2 - 2009/08/15\\nGeneral - STANDARD COVERAGE\\nCOMMUTE TO OFFICE DAILY\\nMULTI-POLICY DISCOUNT\\nDeductible collision $500 & comp $500\\nPayment Plan - Annual",
  "payment_info": {
    "annual_premium": "2850.00",
    "monthly_payment": null,
    "payment_type": "annual"
  },
  "signatures": {
    "applicant_signed": true,
    "applicant_signature_date": "2024-02-15",
    "broker_signed": true,
    "broker_signature_date": "2024-02-15"
  }
}

只返回原始JSON字符串，不要包含任何额外的格式、markdown或解释。如果某个字段在文档中不存在，返回null。`;
}

// JSON解析函数
function parseAIResponse(data: string): ApplicationData | null {
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