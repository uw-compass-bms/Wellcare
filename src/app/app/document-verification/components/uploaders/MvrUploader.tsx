"use client";
import { Shield } from 'lucide-react';
import { DocumentState } from '../../types';
import MultiFileUploader from './MultiFileUploader';

interface MvrUploaderProps {
  documentState: DocumentState;
  onMultiFileUpload: (files: File[]) => Promise<void>;
  onFileDelete: (fileId: string) => void;
  onFileReprocess?: (fileId: string) => Promise<void>;
}

export default function MvrUploader({ 
  documentState, 
  onMultiFileUpload,
  onFileDelete,
  onFileReprocess
}: MvrUploaderProps) {
  return (
    <MultiFileUploader
      documentState={documentState}
      onMultiFileUpload={onMultiFileUpload}
      onFileDelete={onFileDelete}
      onFileReprocess={onFileReprocess}
      title="MVR Documents"
      icon={Shield}
      inputId="mvr-upload"
    />
  );
} 