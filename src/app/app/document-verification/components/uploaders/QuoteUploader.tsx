"use client";
import { Calculator } from 'lucide-react';
import { DocumentState } from '../../types';
import SingleFileUploader from './SingleFileUploader';

interface QuoteUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
  onFileDelete?: () => void;
  onFileReprocess?: () => Promise<void>;
}

export default function QuoteUploader({ 
  documentState, 
  onFileUpload,
  onFileDelete,
  onFileReprocess
}: QuoteUploaderProps) {
  return (
    <SingleFileUploader
      documentState={documentState}
      onFileUpload={onFileUpload}
      onFileDelete={onFileDelete}
      onFileReprocess={onFileReprocess}
      title="Quote Documents"
      description="Insurance quote information"
      icon={Calculator}
      inputId="quote-upload"
    />
  );
} 