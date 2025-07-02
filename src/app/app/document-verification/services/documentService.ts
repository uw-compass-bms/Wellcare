import { DocumentType, CachedFile } from '../types';

export class DocumentService {
  // API端点映射
  private static apiEndpoints = {
    mvr: '/api/extract-mvr',
    autoplus: '/api/extract-autoplus',
    quote: '/api/extract-quote',
    application: '/api/extract-application'
  };

  // 处理单个文档
  static async processDocument(type: DocumentType, cachedFile: CachedFile) {
    try {
      const response = await fetch(this.apiEndpoints[type], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          b64data: cachedFile.b64data,
          fileName: cachedFile.fileName,
          fileSize: cachedFile.fileSize,
          fileType: cachedFile.fileType,
        }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      } else {
        throw new Error(result.error || "Processing failed");
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error("Network error, please try again");
    }
  }

  // 将文件转换为base64
  static convertFileToBase64(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const b64 = result.split(',')[1];
        if (b64) resolve(b64);
        else reject(new Error("Failed to extract base64 data"));
      };
      reader.onerror = reject;
    });
  }

  // 创建缓存文件对象
  static async createCachedFile(file: File): Promise<CachedFile> {
    const b64data = await this.convertFileToBase64(file);
    return {
      file: file,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      b64data: b64data
    };
  }
} 