import { DocumentType, CachedFile, CachedFileWithId } from '../types';

export class DocumentService {
  // API端点映射
  private static apiEndpoints = {
    mvr: '/api/document-extraction/mvr',
    autoplus: '/api/document-extraction/autoplus',
    quote: '/api/document-extraction/quote',
    application: '/api/document-extraction/application'
  };

  // 多文件API端点映射
  private static multiFileEndpoints = {
    mvr: '/api/document-extraction/mvr',
    autoplus: '/api/document-extraction/autoplus'
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

  // 生成文件ID
  static generateFileId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 创建带ID的缓存文件对象
  static async createCachedFileWithId(file: File): Promise<CachedFileWithId> {
    const cachedFile = await this.createCachedFile(file);
    return {
      ...cachedFile,
      fileId: this.generateFileId()
    };
  }

  // 处理多文件MVR
  static async processMultiMvrFiles(files: CachedFileWithId[]) {
    const payload = {
      files: files.map(file => ({
        b64data: file.b64data,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        fileId: file.fileId
      }))
    };

    const response = await fetch(this.multiFileEndpoints.mvr, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Processing failed');
    }

    return result.data;
  }

  // 处理多文件Auto+
  static async processMultiAutoPlusFiles(files: CachedFileWithId[]) {
    const payload = {
      files: files.map(file => ({
        b64data: file.b64data,
        fileName: file.fileName,
        fileSize: file.fileSize,
        fileType: file.fileType,
        fileId: file.fileId
      }))
    };

    const response = await fetch(this.multiFileEndpoints.autoplus, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Processing failed');
    }

    return result.data;
  }
} 