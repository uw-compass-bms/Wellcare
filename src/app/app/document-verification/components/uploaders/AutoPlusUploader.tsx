"use client";
import { Car } from 'lucide-react';
import { DocumentState } from '../../types';
import BaseUploader from './BaseUploader';

interface AutoPlusUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
}

export default function AutoPlusUploader({ documentState, onFileUpload }: AutoPlusUploaderProps) {
  return (
    <BaseUploader
      documentState={documentState}
      onFileUpload={onFileUpload}
      title="Auto+ Documents"
      description="Insurance history records"
      icon={Car}
      color="green"
      inputId="autoplus-upload"
    />
  );
} 