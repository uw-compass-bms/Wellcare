"use client";
import { FileCheck } from 'lucide-react';
import { DocumentState } from '../../types';
import SingleFileUploader from './SingleFileUploader';

interface ApplicationUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
  onFileDelete?: () => void;
}

export default function ApplicationUploader({ 
  documentState, 
  onFileUpload,
  onFileDelete
}: ApplicationUploaderProps) {
  return (
    <SingleFileUploader
      documentState={documentState}
      onFileUpload={onFileUpload}
      onFileDelete={onFileDelete}
      title="Application Forms"
      description="Ontario (OAF 1)"
      icon={FileCheck}
      inputId="application-upload"
    />
  );
} 