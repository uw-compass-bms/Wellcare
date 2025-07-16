/**
 * 签名位置API服务
 * 处理签名位置的增删改查操作
 */

export interface SignaturePosition {
  id?: string;
  recipientId: string;
  fileId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  placeholderText?: string;
  status?: 'pending' | 'signed';
  signatureContent?: string;
  signedAt?: string;
}

export interface CreatePositionRequest {
  recipientId: string;
  fileId: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth?: number;
  pageHeight?: number;
  placeholderText?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 获取收件人的所有签名位置
 */
export async function getRecipientPositions(recipientId: string): Promise<ApiResponse<SignaturePosition[]>> {
  try {
    const response = await fetch(`/api/signature/recipients/${recipientId}/positions`);
    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`,
        message: result.message
      };
    }

    return {
      success: true,
      data: result.data || []
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 创建新的签名位置
 */
export async function createSignaturePosition(position: CreatePositionRequest): Promise<ApiResponse<SignaturePosition>> {
  try {
    const response = await fetch('/api/signature/positions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(position)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`,
        message: result.message
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 更新签名位置
 */
export async function updateSignaturePosition(
  positionId: string, 
  updates: Partial<CreatePositionRequest>
): Promise<ApiResponse<SignaturePosition>> {
  try {
    const response = await fetch(`/api/signature/positions/${positionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`,
        message: result.message
      };
    }

    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 删除签名位置
 */
export async function deleteSignaturePosition(positionId: string): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(`/api/signature/positions/${positionId}`, {
      method: 'DELETE'
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}`,
        message: result.message
      };
    }

    return {
      success: true
    };
  } catch (error) {
    return {
      success: false,
      error: 'Network error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * 批量保存签名位置（用于保存草稿）
 */
export async function batchSavePositions(positions: CreatePositionRequest[]): Promise<ApiResponse<SignaturePosition[]>> {
  try {
    // 逐个创建位置（后续可以优化为真正的批量API）
    const results: SignaturePosition[] = [];
    const errors: string[] = [];

    for (const position of positions) {
      const result = await createSignaturePosition(position);
      if (result.success && result.data) {
        results.push(result.data);
      } else {
        errors.push(result.error || 'Unknown error');
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `部分位置保存失败: ${errors.join(', ')}`,
        data: results
      };
    }

    return {
      success: true,
      data: results
    };
  } catch (error) {
    return {
      success: false,
      error: 'Batch save error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 