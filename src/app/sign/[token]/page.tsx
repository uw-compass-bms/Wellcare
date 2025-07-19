'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2, Check, X, Calendar, Type, Square } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

// 设置PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface SignatureWidget {
  id: string;
  type: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  placeholder: string;
  value?: string;
  status: 'pending' | 'signed';
}

export default function PublicSignPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  // 状态管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<any>(null);
  const [task, setTask] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [widgets, setWidgets] = useState<SignatureWidget[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');

  // 验证token并加载数据
  useEffect(() => {
    validateAndLoadData();
  }, [token]);

  const validateAndLoadData = async () => {
    try {
      const response = await fetch(`/api/public/sign/${token}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Invalid or expired link');
        setLoading(false);
        return;
      }

      if (result.data.recipient.status === 'signed') {
        setError('You have already signed this document');
        setLoading(false);
        return;
      }

      setRecipient(result.data.recipient);
      setTask(result.data.task);
      setFiles(result.data.files);

      // 转换位置数据为widgets
      const widgetsData: SignatureWidget[] = result.data.positions.map((pos: any) => ({
        id: pos.id,
        type: pos.field_type || detectWidgetType(pos.placeholder_text),
        page: pos.page_number,
        x: pos.x_percent,
        y: pos.y_percent,
        width: pos.width_percent,
        height: pos.height_percent,
        placeholder: pos.placeholder_text,
        value: pos.signature_content,
        status: pos.status
      }));
      setWidgets(widgetsData);

      setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load document');
      setLoading(false);
    }
  };

  // 检测widget类型
  const detectWidgetType = (placeholder: string): string => {
    const lower = placeholder.toLowerCase();
    if (lower.includes('signature')) return 'signature';
    if (lower.includes('date')) return 'date';
    if (lower.includes('initial')) return 'initials';
    return 'text';
  };

  // 生成签名样式
  const generateSignatureStyle = (name: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#000080';
      ctx.font = 'italic 30px "Dancing Script", cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, canvas.width / 2, canvas.height / 2);
      
      ctx.strokeStyle = '#000080';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, canvas.height * 0.7);
      ctx.lineTo(canvas.width - 50, canvas.height * 0.7);
      ctx.stroke();
      
      return canvas.toDataURL('image/png');
    }
    
    return `Signed by ${name}`;
  };

  // 处理签名点击
  const handleWidgetClick = async (widget: SignatureWidget) => {
    if (widget.status === 'signed') return;

    // 根据widget类型处理
    switch (widget.type) {
      case 'signature':
        // 自动生成签名
        const signature = generateSignatureStyle(recipient?.name || 'User');
        await updateWidgetValue(widget.id, signature);
        break;
      
      case 'date':
        const today = new Date().toLocaleDateString();
        await updateWidgetValue(widget.id, today);
        break;
      
      case 'text':
      case 'name':
      case 'email':
      case 'number':
        const promptText = widget.type === 'email' ? 'Enter your email:' : 
                         widget.type === 'name' ? 'Enter your name:' :
                         widget.type === 'number' ? 'Enter number:' :
                         widget.placeholder + ':';
        const value = prompt(promptText);
        if (value) {
          await updateWidgetValue(widget.id, value);
        }
        break;
        
      case 'checkbox':
        // Toggle checkbox value
        const newValue = widget.value === 'checked' ? '' : 'checked';
        await updateWidgetValue(widget.id, newValue);
        break;
    }
  };


  // 更新widget值
  const updateWidgetValue = async (widgetId: string, value: string) => {
    try {
      const response = await fetch(`/api/public/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId: widgetId, value })
      });

      if (response.ok) {
        // 更新本地状态
        setWidgets(widgets.map(w => 
          w.id === widgetId 
            ? { ...w, value, status: 'signed' }
            : w
        ));
      }
    } catch (err) {
      console.error('Error updating widget:', err);
    }
  };

  // 完成签名
  const handleCompleteSignature = async () => {
    // 检查是否所有必填项都已填写
    const pendingWidgets = widgets.filter(w => w.status === 'pending');
    if (pendingWidgets.length > 0) {
      alert(`Please complete all ${pendingWidgets.length} signature fields`);
      return;
    }

    setSigning(true);
    try {
      const response = await fetch(`/api/public/sign/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (response.ok) {
        alert('Thank you! Your signature has been recorded.');
        router.push('/sign/complete');
      } else {
        alert(result.error || 'Failed to complete signature. Please try again.');
      }
    } catch (err) {
      console.error('Error completing signature:', err);
      alert('Failed to complete signature. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  // 渲染widget
  const renderWidget = (widget: SignatureWidget) => {
    const isSigned = widget.status === 'signed';
    
    // 获取对应的图标
    const getIcon = () => {
      switch (widget.type) {
        case 'signature':
          return <Type className="w-4 h-4 mr-1" />;
        case 'date':
          return <Calendar className="w-4 h-4 mr-1" />;
        case 'checkbox':
          return <Square className="w-4 h-4 mr-1" />;
        default:
          return null;
      }
    };
    
    return (
      <div
        key={widget.id}
        className={`
          absolute border-2 rounded cursor-pointer transition-all
          ${isSigned 
            ? 'bg-green-50 border-green-300' 
            : 'bg-blue-50 border-blue-300 hover:bg-blue-100'
          }
        `}
        style={{
          left: `${widget.x}%`,
          top: `${widget.y}%`,
          width: `${widget.width}%`,
          height: `${widget.height}%`,
        }}
        onClick={() => handleWidgetClick(widget)}
      >
        <div className="flex items-center justify-center h-full text-xs p-2">
          {widget.value ? (
            widget.type === 'signature' && widget.value.startsWith('data:image') ? (
              <img src={widget.value} alt="Signature" className="max-w-full max-h-full object-contain" />
            ) : widget.type === 'checkbox' ? (
              <Check className="w-6 h-6 text-green-700" />
            ) : (
              <span className="text-green-700 font-medium">{widget.value}</span>
            )
          ) : (
            <div className="flex items-center text-blue-600">
              {getIcon()}
              <span>{widget.placeholder}</span>
            </div>
          )}
        </div>
        {isSigned && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center">
            <Check size={12} />
          </div>
        )}
      </div>
    );
  };

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-teal-600" />
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <X className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const currentFile = files[currentFileIndex];
  const currentFileWidgets = widgets.filter(w => 
    w.page === currentPage && 
    files.findIndex(f => f.id === currentFile.id) === currentFileIndex
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{task.title}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Signing as: {recipient.name} ({recipient.email})
              </p>
            </div>
            <button
              onClick={handleCompleteSignature}
              disabled={signing || widgets.some(w => w.status === 'pending')}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signing ? 'Completing...' : 'Complete Signature'}
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-gray-200 h-1">
        <div 
          className="bg-teal-600 h-1 transition-all"
          style={{
            width: `${(widgets.filter(w => w.status === 'signed').length / widgets.length) * 100}%`
          }}
        />
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* PDF Viewer */}
          <div className="relative">
            <Document
              file={currentFile.original_file_url}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              className="flex justify-center"
            >
              <div className="relative">
                <Page
                  pageNumber={currentPage}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-lg"
                />
                
                {/* Widgets overlay */}
                <div className="absolute inset-0">
                  {currentFileWidgets.map(widget => renderWidget(widget))}
                </div>
              </div>
            </Document>
          </div>

          {/* Navigation */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {numPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                disabled={currentPage >= numPages}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>

            {files.length > 1 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  File {currentFileIndex + 1} of {files.length}
                </span>
                <button
                  onClick={() => {
                    if (currentFileIndex < files.length - 1) {
                      setCurrentFileIndex(currentFileIndex + 1);
                      setCurrentPage(1);
                    }
                  }}
                  disabled={currentFileIndex >= files.length - 1}
                  className="text-sm text-teal-600 hover:underline disabled:opacity-50"
                >
                  Next File →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Instructions:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Click on signature fields to automatically generate your signature</li>
            <li>• Fill in text fields with your information</li>
            <li>• Green boxes indicate completed fields</li>
            <li>• Complete all fields before clicking "Complete Signature"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}