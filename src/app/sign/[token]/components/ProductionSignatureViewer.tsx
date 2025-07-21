'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Check } from 'lucide-react';
import { Toast } from '@/lib/utils/toast';
import { PDFViewer } from '@/app/app/signature/pdf/components/PDFViewer';
import { format } from 'date-fns';

interface Field {
  id: string;
  file_id: string;
  page_number: number;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  placeholder_text?: string;
  field_type?: string;
  field_meta?: any;
  is_required?: boolean;
  default_value?: string;
}

interface ProductionSignatureViewerProps {
  token: string;
  tokenData: {
    recipient: {
      id: string;
      name: string;
      email: string;
      status: string;
    };
    task: {
      id: string;
      title: string;
      description?: string;
    };
    files: Array<{
      id: string;
      name: string;
      url: string;
      order: number;
    }>;
    fields: Field[];
    expiresAt: string;
  };
}

export function ProductionSignatureViewer({ token, tokenData }: ProductionSignatureViewerProps) {
  const [loading, setLoading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [fileDimensions, setFileDimensions] = useState<Record<string, { width: number; height: number }>>({});

  const currentFile = tokenData.files[currentFileIndex];
  const currentFields = tokenData.fields.filter(f => f.file_id === currentFile?.id);

  useEffect(() => {
    // 初始化默认值
    const defaults: Record<string, string> = {};
    tokenData.fields.forEach(field => {
      if (field.default_value) {
        defaults[field.id] = field.default_value;
      } else if (field.field_type === 'name') {
        defaults[field.id] = tokenData.recipient.name;
      } else if (field.field_type === 'email') {
        defaults[field.id] = tokenData.recipient.email;
      } else if (field.field_type === 'date') {
        defaults[field.id] = format(new Date(), 'yyyy-MM-dd');
      }
    });
    setFieldValues(defaults);
  }, [tokenData]);

  const handleFieldClick = (field: Field) => {
    const fieldType = field.field_type || 'text';
    
    switch (fieldType) {
      case 'signature':
        // 简化签名：点击即确认
        const signatureValue = `Signed by ${tokenData.recipient.name} at ${new Date().toISOString()}`;
        setFieldValues(prev => ({
          ...prev,
          [field.id]: signatureValue
        }));
        Toast.success('Signature confirmed');
        break;
        
      case 'date':
        const dateValue = prompt('Enter date (YYYY-MM-DD):', fieldValues[field.id] || format(new Date(), 'yyyy-MM-dd'));
        if (dateValue) {
          setFieldValues(prev => ({
            ...prev,
            [field.id]: dateValue
          }));
        }
        break;
        
      case 'checkbox':
        setFieldValues(prev => ({
          ...prev,
          [field.id]: prev[field.id] === 'true' ? 'false' : 'true'
        }));
        break;
        
      default:
        const textValue = prompt(`Enter ${fieldType}:`, fieldValues[field.id] || '');
        if (textValue !== null) {
          setFieldValues(prev => ({
            ...prev,
            [field.id]: textValue
          }));
        }
    }
  };

  const validateFields = () => {
    const requiredFields = tokenData.fields.filter(f => f.is_required !== false);
    const missingFields = requiredFields.filter(f => !fieldValues[f.id]);
    
    if (missingFields.length > 0) {
      Toast.error(`Please fill in all required fields (${missingFields.length} remaining)`);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateFields()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/signature/submit-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          fieldValues,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit signature');
      }

      Toast.success('Document signed successfully!');
      
      setTimeout(() => {
        window.location.href = `/sign/${token}/success`;
      }, 1500);
    } catch (error) {
      console.error('Submit error:', error);
      Toast.error(error instanceof Error ? error.message : 'Failed to submit signature');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFieldLayer = () => {
    if (!currentFile) return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {currentFields.map(field => {
          const hasValue = !!fieldValues[field.id];
          const fieldType = field.field_type || 'text';
          const isSignature = fieldType === 'signature';
          const isCheckbox = fieldType === 'checkbox';
          const isChecked = fieldValues[field.id] === 'true';

          return (
            <div
              key={field.id}
              className={`absolute border-2 rounded pointer-events-auto cursor-pointer transition-all ${
                hasValue 
                  ? 'border-green-500 bg-green-50' 
                  : field.is_required !== false
                    ? 'border-red-500 bg-red-50' 
                    : 'border-blue-500 bg-blue-50'
              } hover:shadow-lg`}
              style={{
                left: `${field.x_percent}%`,
                top: `${field.y_percent}%`,
                width: `${field.width_percent}%`,
                height: `${field.height_percent}%`,
              }}
              onClick={() => handleFieldClick(field)}
            >
              <div className="w-full h-full flex items-center justify-center p-2">
                {hasValue ? (
                  isSignature ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-medium">Signed</span>
                    </div>
                  ) : isCheckbox ? (
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="h-4 w-4 pointer-events-none"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-700 truncate">
                      {fieldValues[field.id]}
                    </span>
                  )
                ) : (
                  <span className="text-sm text-gray-500">
                    {field.placeholder_text || `Click to add ${fieldType}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!currentFile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No files to display</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {tokenData.files.length > 1 && (
            <select
              value={currentFileIndex}
              onChange={(e) => setCurrentFileIndex(Number(e.target.value))}
              className="px-3 py-1 border rounded text-sm"
            >
              {tokenData.files.map((file, index) => (
                <option key={file.id} value={index}>
                  {file.name} ({index + 1}/{tokenData.files.length})
                </option>
              ))}
            </select>
          )}
          <span className="text-sm text-gray-600">
            Fields: {currentFields.filter(f => fieldValues[f.id]).length}/{currentFields.length} completed
          </span>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || Object.keys(fieldValues).length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Signature
            </>
          )}
        </Button>
      </div>

      {/* PDF Viewer with fields overlay */}
      <div className="flex-1 overflow-auto">
        <PDFViewer
          fileUrl={currentFile.url}
          onDocumentLoad={(numPages) => {
            console.log('PDF loaded with', numPages, 'pages');
          }}
          className="relative"
        >
          {renderFieldLayer()}
        </PDFViewer>
      </div>
    </div>
  );
}