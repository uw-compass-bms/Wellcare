"use client";
import React from 'react';
import { FileCheck } from 'lucide-react';
import { DocumentState } from '../../types';
import BaseUploader from './BaseUploader';

interface ApplicationUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
}

export default function ApplicationUploader({ documentState, onFileUpload }: ApplicationUploaderProps) {
  return (
    <BaseUploader
      documentState={documentState}
      onFileUpload={onFileUpload}
      title="Application Forms"
      description="Ontario汽车保险申请表 (OAF 1)"
      icon={FileCheck}
      color="orange"
      inputId="application-upload"
    />
  );
} 