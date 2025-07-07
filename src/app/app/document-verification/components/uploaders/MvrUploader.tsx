"use client";
import { Shield } from 'lucide-react';
import { DocumentState } from '../../types';
import MultiFileUploader from './MultiFileUploader';

interface MvrUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
  onMultiFileUpload: (files: File[]) => Promise<void>;
  onFileDelete: (fileId: string) => void;
}

export default function MvrUploader({ 
  documentState, 
  onFileUpload,
  onMultiFileUpload,
  onFileDelete
}: MvrUploaderProps) {
  return (
    <MultiFileUploader
      documentState={documentState}
      onFileUpload={onFileUpload}
      onMultiFileUpload={onMultiFileUpload}
      onFileDelete={onFileDelete}
      title="MVR Documents"
      description="Motor Vehicle Records"
      icon={Shield}
      inputId="mvr-upload"
    />
  );
} 