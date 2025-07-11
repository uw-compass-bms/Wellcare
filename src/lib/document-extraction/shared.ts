// 文档提取共用工具函数

// 文件类型检测函数
export function b64dataIsPdf(b64data: string): boolean {
  return b64data.startsWith("JVBERi");
}

export function b64dataIsImage(b64data: string): boolean {
  return (
    b64data.startsWith("/9j/") ||
    b64data.startsWith("iVBORw0KGgo") ||
    b64data.startsWith("UklGR")
  );
}

export function getImageMediaType(base64Data: string): "image/jpeg" | "image/png" | "image/webp" {
  if (base64Data.startsWith("/9j/")) {
    return "image/jpeg";
  } else if (base64Data.startsWith("iVBORw0KGgo")) {
    return "image/png";
  } else if (base64Data.startsWith("UklGR")) {
    return "image/webp";
  }
  throw new Error("不支持的图片格式");
}

export function encodeImageToBase64(base64data: string): string {
  const mediaType = getImageMediaType(base64data);
  return `data:${mediaType};base64,${base64data}`;
}

export function encodePdfToBase64(base64data: string): string {
  return `data:application/pdf;base64,${base64data}`;
}

export function encodeBase64ToData(base64data: string): {
  fileType: "pdf" | "image";
  fileData: string;
} {
  if (b64dataIsPdf(base64data)) {
    return { fileType: "pdf", fileData: encodePdfToBase64(base64data) };
  } else if (b64dataIsImage(base64data)) {
    return { fileType: "image", fileData: encodeImageToBase64(base64data) };
  } else {
    throw new Error("不支持的文件类型");
  }
}

// JSON解析函数
export function parseAIResponse<T>(data: string): T | null {
  try {
    if (typeof data === "string") {
      let cleanedData = data.trim();
      
      // 移除markdown代码块
      if (cleanedData.startsWith("```json")) {
        cleanedData = cleanedData.substring(7, cleanedData.length - 3).trim();
      }
      if (cleanedData.endsWith("```")) {
        cleanedData = cleanedData.substring(0, cleanedData.length - 3).trim();
      }
      
      return JSON.parse(cleanedData);
    } else {
      return data;
    }
  } catch (error) {
    console.error("JSON解析错误:", error);
    return null;
  }
}

// 统一AI调用函数
export async function callAI(b64data: string, prompt: string, fileName: string = "document") {
  const model = "google/gemini-2.5-flash-preview";
  
  try {
    const { fileType, fileData } = encodeBase64ToData(b64data);
    console.log(`处理文件类型: ${fileType}`);

    const requestBody = {
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            ...(fileType === "pdf"
              ? [
                  {
                    type: "file",
                    file: {
                      filename: `${fileName}.pdf`,
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

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const response = await res.json();
    
    return {
      response,
      text: response.choices?.[0]?.message?.content,
    };
    
  } catch (error) {
    console.error("AI调用错误:", error);
    throw error;
  }
}

// 统一错误处理
export function handleAPIError(error: unknown, context: string) {
  console.error(`${context}处理出错:`, error);
  
  if (error instanceof Error && error.message.includes('API error')) {
    return {
      success: false, 
      error: 'AI服务暂时不可用，请稍后重试',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      status: 503
    };
  }
  
  return {
    success: false, 
    error: '文件处理失败，请检查文件格式',
    details: process.env.NODE_ENV === 'development' ? 
      (error instanceof Error ? error.message : 'Unknown error') : undefined,
    status: 500
  };
} 