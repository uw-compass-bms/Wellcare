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
  onFileDelete?: (fileId: string, type: DocumentType) => void;
  onFileReplace?: (fileId: string, newFile: File, type: DocumentType) => Promise<void>;
}

export default function DocumentUploadSection({ 
  documents, 
  onFileUpload,
  onMultiFileUpload,
  onFileDelete,
  onFileReplace
}: DocumentUploadSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MvrUploader 
        documentState={documents.mvr}
        onFileUpload={(file: File) => onFileUpload(file, 'mvr')}
        onMultiFileUpload={(files: File[]) => onMultiFileUpload ? onMultiFileUpload(files, 'mvr') : Promise.resolve()}
        onFileDelete={(fileId: string) => onFileDelete && onFileDelete(fileId, 'mvr')}
        onFileReplace={(fileId: string, newFile: File) => onFileReplace ? onFileReplace(fileId, newFile, 'mvr') : Promise.resolve()}
      />
      <AutoPlusUploader 
        documentState={documents.autoplus}
        onFileUpload={(file: File) => onFileUpload(file, 'autoplus')}
        onMultiFileUpload={(files: File[]) => onMultiFileUpload ? onMultiFileUpload(files, 'autoplus') : Promise.resolve()}
        onFileDelete={(fileId: string) => onFileDelete && onFileDelete(fileId, 'autoplus')}
        onFileReplace={(fileId: string, newFile: File) => onFileReplace ? onFileReplace(fileId, newFile, 'autoplus') : Promise.resolve()}
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