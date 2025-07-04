"use client";
import { DocumentType, DocumentState } from '../types';
import AutoPlusUploader from './uploaders/AutoPlusUploader';
import MvrUploader from './uploaders/MvrUploader';
import QuoteUploader from './uploaders/QuoteUploader';
import ApplicationUploader from './uploaders/ApplicationUploader';

interface DocumentUploadSectionProps {
  documents: Record<DocumentType, DocumentState>;
  onFileUpload: (file: File, type: DocumentType) => Promise<void>;
}

export default function DocumentUploadSection({ 
  documents, 
  onFileUpload 
}: DocumentUploadSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MvrUploader 
        documentState={documents.mvr}
        onFileUpload={(file: File) => onFileUpload(file, 'mvr')}
      />
      <AutoPlusUploader 
        documentState={documents.autoplus}
        onFileUpload={(file: File) => onFileUpload(file, 'autoplus')}
      />
      <QuoteUploader 
        documentState={documents.quote}
        onFileUpload={(file: File) => onFileUpload(file, 'quote')}
      />
      <ApplicationUploader 
        documentState={documents.application}
        onFileUpload={(file: File) => onFileUpload(file, 'application')}
      />
    </div>
  );
} 