"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Upload, Clock, LucideIcon } from 'lucide-react';
import { DocumentState } from '../../types';

interface BaseUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  inputId: string;
  acceptedFormats?: string;
}

export default function BaseUploader({ 
  documentState, 
  onFileUpload,
  title,
  description,
  icon: Icon,
  color,
  inputId,
  acceptedFormats = ".pdf,.png,.jpg,.jpeg,.webp"
}: BaseUploaderProps) {
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  // 获取状态样式
  const getStatusStyles = () => {
    if (documentState.uploaded) {
      return {
        border: 'border-green-200 border-2',
        bg: 'bg-green-50',
        iconColor: 'text-green-600',
        status: 'processed'
      };
    }
    if (documentState.cached) {
      return {
        border: `border-${color}-200 border-2`,
        bg: `bg-${color}-50`,
        iconColor: `text-${color}-600`,
        status: 'cached'
      };
    }
    return {
      border: 'border-gray-200',
      bg: `bg-${color}-50`,
      iconColor: `text-${color}-600`,
      status: 'empty'
    };
  };

  const statusStyles = getStatusStyles();

  // 获取状态描述
  const getStatusDescription = () => {
    if (documentState.uploaded) return 'Processed successfully';
    if (documentState.cached) return 'Ready for processing';
    return description;
  };

  // 获取按钮文本
  const getButtonText = () => {
    if (documentState.uploaded) return `Re-upload ${title}`;
    if (documentState.cached) return `Replace ${title}`;
    return `Upload ${title}`;
  };

  // 获取按钮图标
  const getButtonIcon = () => {
    if (documentState.loading) return Loader2;
    if (documentState.uploaded) return CheckCircle;
    if (documentState.cached) return Clock;
    return Upload;
  };

  const ButtonIcon = getButtonIcon();

  return (
    <Card 
      className={`hover:shadow-lg transition-shadow ${statusStyles.border}`}
    >
      <CardHeader className="text-center">
        <div className={`w-16 h-16 ${statusStyles.bg} rounded-full flex items-center justify-center mx-auto mb-4 relative`}>
          <Icon className={`w-8 h-8 ${statusStyles.iconColor}`} />
          {documentState.uploaded && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
          )}
          {documentState.cached && !documentState.uploaded && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Clock className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{getStatusDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="space-y-3">
          <input
            type="file"
            id={inputId}
            className="hidden"
            accept={acceptedFormats}
            onChange={handleFileChange}
            disabled={documentState.loading}
          />
          <Button 
            asChild 
            className="w-full"
            disabled={documentState.loading}
            variant={documentState.uploaded || documentState.cached ? "outline" : "default"}
          >
            <label htmlFor={inputId} className="cursor-pointer">
              <ButtonIcon className={`w-4 h-4 mr-2 ${documentState.loading ? 'animate-spin' : ''}`} />
              {getButtonText()}
            </label>
          </Button>
          
          {documentState.error && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {documentState.error}
            </div>
          )}
          
          <p className="text-xs text-gray-500">
            Supports PDF, PNG, JPG, JPEG, WebP
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 