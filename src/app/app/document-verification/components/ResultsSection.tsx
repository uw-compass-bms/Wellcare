"use client";
import { DocumentType, DocumentState } from '../types';
import ProcessedDataTabs from './results/ProcessedDataTabs';
import BusinessRulesValidation from './results/business-rules/BusinessRulesValidation';

interface ResultsSectionProps {
  documents: Record<DocumentType, DocumentState>;
  onReprocessDocument?: (type: DocumentType) => Promise<void>;
  isProcessing?: boolean;
  processingStep?: DocumentType | null;
  // Validation related props
  isValidating?: boolean;
  validationStep?: string | null;
  hasValidated?: boolean;
  validationKey?: number;
}

export default function ResultsSection({ 
  documents, 
  onReprocessDocument, 
  isProcessing, 
  processingStep,
  isValidating = false,
  validationStep = null,
  hasValidated = false,
  validationKey = 0
}: ResultsSectionProps) {
  // Check if any documents have data, are loading, or have errors - 支持实时显示
  const hasDocumentActivity = Object.values(documents).some(doc => 
    doc.data || doc.loading || doc.error
  );
  
  if (!hasDocumentActivity) return null;

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
      <BusinessRulesValidation 
        documents={documents} 
        shouldValidate={hasValidated || isValidating}
        validationKey={validationKey}
      />
    </div>
  );
} 