"use client";
import { DocumentType, DocumentState } from '../types';
import ProcessedDataTabs from './results/ProcessedDataTabs';
import BusinessRulesValidation from './results/business-rules/BusinessRulesValidation';

interface ResultsSectionProps {
  documents: Record<DocumentType, DocumentState>;
}

export default function ResultsSection({ documents }: ResultsSectionProps) {
  // Check if any documents have been uploaded
  const hasUploadedDocuments = Object.values(documents).some(doc => doc.uploaded);
  
  if (!hasUploadedDocuments) return null;

  return (
    <div className="space-y-8">
      {/* Processed data tabs */}
      <ProcessedDataTabs documents={documents} />
      
      {/* Business rules validation */}
      <BusinessRulesValidation documents={documents} />
    </div>
  );
} 