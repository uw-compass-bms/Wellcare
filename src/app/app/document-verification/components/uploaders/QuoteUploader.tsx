"use client";
import { Calculator } from 'lucide-react';
import { DocumentState } from '../../types';
import SingleFileUploader from './SingleFileUploader';

interface QuoteUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
  onFileDelete?: () => void;
}

export default function QuoteUploader({ 
  documentState, 
  onFileUpload,
  onFileDelete
}: QuoteUploaderProps) {
  return (
    <SingleFileUploader
      documentState={documentState}
      onFileUpload={onFileUpload}
      onFileDelete={onFileDelete}
      title="Quote Documents"
      description="Insurance quote information"
      icon={Calculator}
      inputId="quote-upload"
    />
  );
} 