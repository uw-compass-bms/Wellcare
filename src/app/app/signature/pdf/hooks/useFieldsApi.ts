import { useState, useCallback } from 'react';
import { Field } from '../components/FieldItem';

interface UseFieldsApiProps {
  taskId: string;
  recipientId: string;
  fileId?: string;
}

interface FieldApiData {
  id: string;
  recipient_id: string;
  file_id: string;
  page_number: number;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  x_pixel: number;
  y_pixel: number;
  width_pixel: number;
  height_pixel: number;
  page_width: number;
  page_height: number;
  placeholder_text: string;
  field_type?: string;
  field_meta?: any;
  is_required?: boolean;
  default_value?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Hook for managing field API operations
 * 用于管理字段API操作的Hook
 */
export const useFieldsApi = ({ taskId, recipientId, fileId }: UseFieldsApiProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert API data to Field format
  const apiToField = (apiData: FieldApiData): Field => ({
    id: apiData.id,
    type: (apiData.field_type || 'signature') as Field['type'],
    recipientId: apiData.recipient_id,
    pageNumber: apiData.page_number,
    x: apiData.x_percent,
    y: apiData.y_percent,
    width: apiData.width_percent,
    height: apiData.height_percent,
    required: apiData.is_required ?? true,
    placeholder: apiData.placeholder_text,
    fieldMeta: apiData.field_meta || {},
    defaultValue: apiData.default_value,
  });

  // Convert Field to API format for POST request
  const fieldToApiPost = (field: Field, pageDimensions?: { width: number; height: number }) => ({
    recipientId: field.recipientId,
    fileId: fileId || '',
    pageNumber: field.pageNumber,
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    pageWidth: pageDimensions?.width || 595,  // Default PDF width if not provided
    pageHeight: pageDimensions?.height || 842, // Default PDF height if not provided
    placeholderText: field.placeholder || 'Click to sign',
    fieldType: field.type,
    fieldMeta: field.fieldMeta || {},
    isRequired: field.required !== undefined ? field.required : true,
    defaultValue: field.defaultValue || '',
  });

  // Fetch fields from API
  const fetchFields = useCallback(async (): Promise<Field[]> => {
    setLoading(true);
    setError(null);
    
    try {
      // Include fileId in the query if available
      let url = `/api/signature/positions?taskId=${taskId}`;
      if (fileId) {
        url += `&fileId=${fileId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch fields');
      }
      
      const result = await response.json();
      if (result.data && Array.isArray(result.data)) {
        return result.data.map(apiToField);
      }
      return [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [taskId, fileId]);

  // Create a new field
  const createField = useCallback(async (field: Field, pageDimensions?: { width: number; height: number }): Promise<Field | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/signature/positions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fieldToApiPost(field, pageDimensions)),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create field');
      }
      
      const result = await response.json();
      if (result.data) {
        // Extract the field data from the nested response
        const fieldData: FieldApiData = {
          id: result.data.id,
          recipient_id: result.data.recipient.id,
          file_id: result.data.file.id,
          page_number: result.data.position.pageNumber,
          x_percent: result.data.position.coordinates.percent.x,
          y_percent: result.data.position.coordinates.percent.y,
          width_percent: result.data.position.coordinates.percent.width,
          height_percent: result.data.position.coordinates.percent.height,
          x_pixel: result.data.position.coordinates.pixel.x,
          y_pixel: result.data.position.coordinates.pixel.y,
          width_pixel: result.data.position.coordinates.pixel.width,
          height_pixel: result.data.position.coordinates.pixel.height,
          page_width: result.data.position.pageDimensions.width,
          page_height: result.data.position.pageDimensions.height,
          placeholder_text: result.data.placeholderText,
          field_type: result.data.fieldType,
          field_meta: result.data.fieldMeta,
          is_required: result.data.isRequired,
          status: result.data.status,
        };
        return apiToField(fieldData);
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [taskId, recipientId, fileId]);

  // Update an existing field
  const updateField = useCallback(async (id: string, updates: Partial<Field>, pageDimensions?: { width: number; height: number }): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/signature/positions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x: updates.x,
          y: updates.y,
          width: updates.width,
          height: updates.height,
          required: updates.required,
          placeholder: updates.placeholder,
          fieldType: updates.type,
          fieldMeta: updates.fieldMeta,
          isRequired: updates.required,
          defaultValue: updates.defaultValue,
          pageWidth: pageDimensions?.width,
          pageHeight: pageDimensions?.height,
          pageNumber: updates.pageNumber,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Only log errors if they're not validation errors that are expected
        if (response.status !== 400 || !errorData.error?.includes('坐标验证失败')) {
          console.error('Field update failed:', {
            status: response.status,
            error: errorData,
            fieldId: id,
            updates,
            errorMessage: errorData.error || errorData.message || 'Unknown error',
            errorDetails: errorData.details
          });
        }
        
        // Don't throw for coordinate validation errors since the field content is still saved
        if (response.status === 400 && errorData.error?.includes('坐标验证失败')) {
          return true; // Consider it successful since content is saved
        }
        
        throw new Error(errorData.error || `Failed to update field: ${response.status}`);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete a field
  const deleteField = useCallback(async (id: string): Promise<boolean> => {
    console.log('Deleting field:', id);
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/signature/positions/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete field');
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchFields,
    createField,
    updateField,
    deleteField,
  };
};