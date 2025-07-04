"use client";
import { Calculator } from 'lucide-react';
import { DocumentState } from '../../types';
import BaseUploader from './BaseUploader';

interface QuoteUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
}

export default function QuoteUploader({ documentState, onFileUpload }: QuoteUploaderProps) {
  return (
    <BaseUploader
      documentState={documentState}
      onFileUpload={onFileUpload}
      title="Quote Documents"
      description="Insurance quote information"
      icon={Calculator}
      color="purple"
      inputId="quote-upload"
    />
  );
} 