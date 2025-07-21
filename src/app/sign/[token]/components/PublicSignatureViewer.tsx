'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Send, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { Toast } from '@/lib/utils/toast';
import { SignatureDrawDialog } from './SignatureDrawDialog';
import { TextInputDialog } from './TextInputDialog';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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
  // 添加计算属性
  type?: string;
  required?: boolean;
}

interface PublicSignatureViewerProps {
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

export function PublicSignatureViewer({ token, tokenData }: PublicSignatureViewerProps) {
  const [loading, setLoading] = useState(true);
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [currentFieldId, setCurrentFieldId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF document
  useEffect(() => {
    loadPdf();
  }, []);

  const loadPdf = async () => {
    try {
      setLoading(true);
      // Assuming we load the first file for now
      const firstFile = tokenData.files[0];
      if (!firstFile) {
        throw new Error('No files available');
      }

      const loadingTask = pdfjsLib.getDocument(firstFile.url);
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to load PDF:', error);
      Toast.error('Failed to load PDF document');
    } finally {
      setLoading(false);
    }
  };

  // Render current page
  useEffect(() => {
    if (pdfDocument && canvasRef.current) {
      renderPage();
    }
  }, [pdfDocument, currentPage, scale]);

  const renderPage = async () => {
    if (!pdfDocument || !canvasRef.current) return;

    // Cancel any ongoing render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    try {
      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
    } catch (error) {
      if (error instanceof Error && error.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', error);
      }
    }
  };

  const handleFieldClick = (field: Field) => {
    // 根据placeholder_text判断字段类型
    const isSignature = field.placeholder_text?.toLowerCase().includes('sign') || 
                       field.placeholder_text === 'Click to sign';
    
    if (isSignature) {
      setCurrentFieldId(field.id);
      setSignatureDialogOpen(true);
    } else {
      setCurrentFieldId(field.id);
      setTextDialogOpen(true);
    }
  };

  const handleSignatureSave = (signatureData: string) => {
    if (currentFieldId) {
      setFieldValues(prev => ({
        ...prev,
        [currentFieldId]: signatureData
      }));
      Toast.success('Signature added');
    }
    setSignatureDialogOpen(false);
    setCurrentFieldId(null);
  };

  const handleTextSave = (text: string) => {
    if (currentFieldId) {
      setFieldValues(prev => ({
        ...prev,
        [currentFieldId]: text
      }));
      Toast.success('Text added');
    }
    setTextDialogOpen(false);
    setCurrentFieldId(null);
  };

  const validateFields = () => {
    // 检查所有必填字段（placeholder_text包含*的字段）
    const requiredFields = tokenData.fields.filter(f => 
      f.placeholder_text?.includes('*') || false
    );
    const missingFields = requiredFields.filter(f => !fieldValues[f.id]);
    
    if (missingFields.length > 0) {
      Toast.error(`Please fill in all required fields (${missingFields.length} remaining)`);
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
      const response = await fetch('/api/signature/submit', {
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
      
      // Redirect to success page or close window
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

  const getCurrentPageFields = () => {
    return tokenData.fields.filter(f => f.page_number === currentPage);
  };

  const renderFields = () => {
    if (!canvasRef.current) return null;

    const fields = getCurrentPageFields();
    const canvasRect = canvasRef.current.getBoundingClientRect();

    return fields.map(field => {
      const left = (field.x_percent / 100) * canvasRect.width;
      const top = (field.y_percent / 100) * canvasRect.height;
      const width = (field.width_percent / 100) * canvasRect.width;
      const height = (field.height_percent / 100) * canvasRect.height;

      const hasValue = !!fieldValues[field.id];
      // 根据placeholder_text判断字段类型
      const isSignature = field.placeholder_text?.toLowerCase().includes('sign') || 
                         field.placeholder_text === 'Click to sign';
      const isRequired = field.placeholder_text?.includes('*') || false;

      return (
        <div
          key={field.id}
          className={`absolute border-2 rounded cursor-pointer transition-all ${
            hasValue 
              ? 'border-green-500 bg-green-50' 
              : isRequired 
                ? 'border-red-500 bg-red-50' 
                : 'border-blue-500 bg-blue-50'
          } hover:shadow-lg`}
          style={{
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
          }}
          onClick={() => handleFieldClick(field)}
        >
          {hasValue ? (
            isSignature ? (
              <img 
                src={fieldValues[field.id]} 
                alt="Signature" 
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-2 text-sm">
                {fieldValues[field.id]}
              </div>
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
              {field.placeholder_text || 'Click to fill'}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
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

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setScale(Math.min(2, scale + 0.1))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
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

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4" ref={containerRef}>
        <div className="relative inline-block">
          <canvas ref={canvasRef} className="shadow-lg" />
          {renderFields()}
        </div>
      </div>

      {/* Signature Dialog */}
      <SignatureDrawDialog
        open={signatureDialogOpen}
        onClose={() => {
          setSignatureDialogOpen(false);
          setCurrentFieldId(null);
        }}
        onSave={handleSignatureSave}
      />

      {/* Text Input Dialog */}
      <TextInputDialog
        open={textDialogOpen}
        onClose={() => {
          setTextDialogOpen(false);
          setCurrentFieldId(null);
        }}
        onSave={handleTextSave}
        initialValue={currentFieldId ? fieldValues[currentFieldId] : ''}
      />
    </div>
  );
}