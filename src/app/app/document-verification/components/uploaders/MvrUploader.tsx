"use client";
import React from 'react';
import { FileText } from 'lucide-react';
import { DocumentState } from '../../types';
import BaseUploader from './BaseUploader';

interface MvrUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
}

export default function MvrUploader({ documentState, onFileUpload }: MvrUploaderProps) {
  return (
    <BaseUploader
      documentState={documentState}
      onFileUpload={onFileUpload}
      title="MVR Documents"
      description="Driver Record Documents"
      icon={FileText}
      color="blue"
      inputId="mvr-upload"
    />
  );
} 