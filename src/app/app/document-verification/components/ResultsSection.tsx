"use client";
import { DocumentType, DocumentState } from '../types';
import ProcessedDataTabs from './results/ProcessedDataTabs';
import BusinessRulesValidation from './results/business-rules/BusinessRulesValidation';

interface ResultsSectionProps {
  documents: Record<DocumentType, DocumentState>;
  onReprocessDocument?: (type: DocumentType) => Promise<void>;
  isProcessing?: boolean;
  processingStep?: DocumentType | null;
}

export default function ResultsSection({ 
  documents, 
  onReprocessDocument, 
  isProcessing, 
  processingStep 
}: ResultsSectionProps) {
  // Check if any documents have been uploaded
  const hasUploadedDocuments = Object.values(documents).some(doc => doc.uploaded);
  
  if (!hasUploadedDocuments) return null;

  return (
    <div className="space-y-8">
      {/* Processed data tabs */}
      <ProcessedDataTabs 
        documents={documents} 
        onReprocessDocument={onReprocessDocument}
        isProcessing={isProcessing}
        processingStep={processingStep}
      />
      
      {/* Business rules validation */}
      <BusinessRulesValidation documents={documents} />
    </div>
  );
} 