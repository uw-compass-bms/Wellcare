"use client";
import { DocumentType, DocumentState } from '../types';
import AutoPlusUploader from './uploaders/AutoPlusUploader';
import MvrUploader from './uploaders/MvrUploader';
import QuoteUploader from './uploaders/QuoteUploader';
import ApplicationUploader from './uploaders/ApplicationUploader';

interface DocumentUploadSectionProps {
  documents: Record<DocumentType, DocumentState>;
  onFileUpload: (file: File, type: DocumentType) => Promise<void>;
  // 多文件支持（MVR和AutoPlus使用）
  onMultiFileUpload?: (files: File[], type: DocumentType) => Promise<void>;
  onFileDelete?: (fileId: string | undefined, type: DocumentType) => void;
}

export default function DocumentUploadSection({ 
  documents, 
  onFileUpload,
  onMultiFileUpload,
  onFileDelete
}: DocumentUploadSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MvrUploader 
        documentState={documents.mvr}
        onFileUpload={(file: File) => onFileUpload(file, 'mvr')}
        onMultiFileUpload={(files: File[]) => onMultiFileUpload ? onMultiFileUpload(files, 'mvr') : Promise.resolve()}
        onFileDelete={(fileId: string) => onFileDelete && onFileDelete(fileId, 'mvr')}
      />
      <AutoPlusUploader 
        documentState={documents.autoplus}
        onFileUpload={(file: File) => onFileUpload(file, 'autoplus')}
        onMultiFileUpload={(files: File[]) => onMultiFileUpload ? onMultiFileUpload(files, 'autoplus') : Promise.resolve()}
        onFileDelete={(fileId: string) => onFileDelete && onFileDelete(fileId, 'autoplus')}
      />
      <QuoteUploader 
        documentState={documents.quote}
        onFileUpload={(file: File) => onFileUpload(file, 'quote')}
        onFileDelete={() => onFileDelete && onFileDelete(undefined, 'quote')}
      />
      <ApplicationUploader 
        documentState={documents.application}
        onFileUpload={(file: File) => onFileUpload(file, 'application')}
        onFileDelete={() => onFileDelete && onFileDelete(undefined, 'application')}
      />
    </div>
  );
} 