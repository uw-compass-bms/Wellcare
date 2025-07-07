"use client";
import { Car } from 'lucide-react';
import { DocumentState } from '../../types';
import MultiFileUploader from './MultiFileUploader';

interface AutoPlusUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
  onMultiFileUpload: (files: File[]) => Promise<void>;
  onFileDelete: (fileId: string) => void;
}

export default function AutoPlusUploader({ 
  documentState, 
  onFileUpload,
  onMultiFileUpload,
  onFileDelete
}: AutoPlusUploaderProps) {
  return (
    <MultiFileUploader
      documentState={documentState}
      onFileUpload={onFileUpload}
      onMultiFileUpload={onMultiFileUpload}
      onFileDelete={onFileDelete}
      title="Auto+ Documents"
      description="Insurance history records"
      icon={Car}
      inputId="autoplus-upload"
    />
  );
} 