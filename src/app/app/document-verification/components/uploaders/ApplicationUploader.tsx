"use client";
import { FileCheck } from 'lucide-react';
import { DocumentState } from '../../types';
import SingleFileUploader from './SingleFileUploader';

interface ApplicationUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
  onFileDelete?: () => void;
  onFileReprocess?: () => Promise<void>;
}

export default function ApplicationUploader({ 
  documentState, 
  onFileUpload,
  onFileDelete,
  onFileReprocess
}: ApplicationUploaderProps) {
  return (
    <SingleFileUploader
      documentState={documentState}
      onFileUpload={onFileUpload}
      onFileDelete={onFileDelete}
      onFileReprocess={onFileReprocess}
      title="Application Forms"
      description="Ontario (OAF 1)"
      icon={FileCheck}
      inputId="application-upload"
    />
  );
} 