'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Toast } from '@/lib/utils/toast';

interface Field {
  id: string;
  page_number: number;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  placeholder_text?: string;
  signature_content?: string;
  status: string;
}

interface SimpleSignatureViewerProps {
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

export function SimpleSignatureViewer({ token, tokenData }: SimpleSignatureViewerProps) {
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    // 使用第一个文件
    if (tokenData.files.length > 0) {
      setPdfUrl(tokenData.files[0].url);
      // 简单假设每个文件有10页（实际应该从PDF中读取）
      setTotalPages(10);
    }
  }, [tokenData.files]);

  const handleFieldClick = (field: Field) => {
    const isSignature = field.placeholder_text?.toLowerCase().includes('sign') || 
                       field.placeholder_text === 'Click to sign';
    
    if (isSignature) {
      // 签名字段：点击即确认签名
      const signatureValue = `Signed by ${tokenData.recipient.name} at ${new Date().toISOString()}`;
      setFieldValues(prev => ({
        ...prev,
        [field.id]: signatureValue
      }));
      Toast.success('Signature confirmed');
    } else {
      // 文本字段：弹出简单输入框
      const text = prompt('Enter text:', fieldValues[field.id] || '');
      if (text !== null) {
        setFieldValues(prev => ({
          ...prev,
          [field.id]: text
        }));
      }
    }
  };

  const getCurrentPageFields = () => {
    return tokenData.fields.filter(f => f.page_number === currentPage);
  };

  const validateFields = () => {
    // 检查是否有字段需要填写
    if (tokenData.fields.length === 0) {
      Toast.error('No fields to fill');
      return false;
    }

    // 至少需要填写一个字段
    if (Object.keys(fieldValues).length === 0) {
      Toast.error('Please fill in at least one field');
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
      
      // Redirect to success page
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

  const renderFields = () => {
    const fields = getCurrentPageFields();

    return fields.map(field => {
      const hasValue = !!fieldValues[field.id];
      const isSignature = field.placeholder_text?.toLowerCase().includes('sign') || 
                         field.placeholder_text === 'Click to sign';

      return (
        <div
          key={field.id}
          className={`inline-block m-2 p-3 border-2 rounded cursor-pointer transition-all ${
            hasValue 
              ? 'border-green-500 bg-green-50' 
              : 'border-blue-500 bg-blue-50 hover:bg-blue-100'
          }`}
          onClick={() => !hasValue && handleFieldClick(field)}
        >
          {hasValue ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                {isSignature ? 'Signed' : fieldValues[field.id]}
              </span>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              {field.placeholder_text || 'Click to fill'}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
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
            'Submit Signature'
          )}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4">
            Fields on Page {currentPage}
          </h2>
          
          <div className="mb-6">
            {getCurrentPageFields().length > 0 ? (
              renderFields()
            ) : (
              <p className="text-gray-500">No fields on this page</p>
            )}
          </div>

          {/* PDF Preview Placeholder */}
          <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-center text-gray-600">
              PDF Preview: {tokenData.files[0]?.name || 'No file'}
            </p>
            {pdfUrl && (
              <div className="mt-4">
                <iframe
                  src={pdfUrl}
                  className="w-full h-96 border rounded"
                  title="PDF Preview"
                />
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">Progress Summary</h3>
            <p className="text-sm">
              Total fields: {tokenData.fields.length}<br />
              Completed: {Object.keys(fieldValues).length}<br />
              Remaining: {tokenData.fields.length - Object.keys(fieldValues).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}