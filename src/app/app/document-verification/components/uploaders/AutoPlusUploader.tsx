"use client";
import { Car } from 'lucide-react';
import { DocumentState } from '../../types';
import MultiFileUploader from './MultiFileUploader';

interface AutoPlusUploaderProps {
  documentState: DocumentState;
  onMultiFileUpload: (files: File[]) => Promise<void>;
  onFileDelete: (fileId: string) => void;
  onFileReprocess?: (fileId: string) => Promise<void>;
}

export default function AutoPlusUploader({ 
  documentState, 
  onMultiFileUpload,
  onFileDelete,
  onFileReprocess
}: AutoPlusUploaderProps) {
  return (
    <MultiFileUploader
      documentState={documentState}
      onMultiFileUpload={onMultiFileUpload}
      onFileDelete={onFileDelete}
      onFileReprocess={onFileReprocess}
      title="Auto+ Documents"
      icon={Car}
      inputId="autoplus-upload"
    />
  );
} 