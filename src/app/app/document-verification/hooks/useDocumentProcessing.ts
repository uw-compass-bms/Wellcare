import { useState } from 'react';
import { DocumentType, DocumentState } from '../types';
import { DocumentService } from '../services/documentService';

export function useDocumentProcessing() {
  // Document state management
  const [documents, setDocuments] = useState<Record<DocumentType, DocumentState>>({
    mvr: { data: null, loading: false, error: null, uploaded: false, cached: false, cachedFile: null },
    autoplus: { data: null, loading: false, error: null, uploaded: false, cached: false, cachedFile: null },
    quote: { data: null, loading: false, error: null, uploaded: false, cached: false, cachedFile: null },
    application: { data: null, loading: false, error: null, uploaded: false, cached: false, cachedFile: null }
  });
  
  // Batch processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<DocumentType | null>(null);

  // Handle file caching (upload only, no processing)
  const handleFileUpload = async (file: File, type: DocumentType) => {
    setDocuments(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true, error: null }
    }));

    try {
      // Create cached file
      const cachedFile = await DocumentService.createCachedFile(file);

      setDocuments(prev => ({
        ...prev,
        [type]: { 
          ...prev[type], 
          loading: false, 
          error: null, 
          cached: true,
          cachedFile: cachedFile,
          // Reset extraction state when new file uploaded
          uploaded: false,
          data: null
        }
      }));

    } catch (err) {
      setDocuments(prev => ({
        ...prev,
        [type]: { 
          ...prev[type], 
          loading: false, 
          error: err instanceof Error ? err.message : "File upload failed",
          cached: false,
          cachedFile: null
        }
      }));
    }
  };

  // Process single document
  const processDocument = async (type: DocumentType) => {
    const cachedFile = documents[type].cachedFile;
    if (!cachedFile) return;

    setDocuments(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true, error: null }
    }));

    try {
      const data = await DocumentService.processDocument(type, cachedFile);
      setDocuments(prev => ({
        ...prev,
        [type]: { 
          ...prev[type],
          data: data, 
          loading: false, 
          error: null, 
          uploaded: true 
        }
      }));
      return data;
    } catch (err) {
      setDocuments(prev => ({
        ...prev,
        [type]: { 
          ...prev[type], 
          loading: false, 
          error: err instanceof Error ? err.message : "Network error, please try again" 
        }
      }));
      throw err;
    }
  };







  // Validate all extracted documents (local business rules)
  const validateDocuments = () => {
    // This will trigger re-rendering of BusinessRulesValidation component
    // which automatically validates all uploaded documents
    // No additional logic needed here as validation is reactive
    console.log('Validation triggered for all extracted documents');
  };

  // Process all documents (extract + validate)
  const processDocuments = async () => {
    // Find documents that need extraction: cached but not extracted yet
    const pendingDocuments = Object.entries(documents).filter(
      ([, state]) => state.cached && !state.uploaded && state.cachedFile
    );
    
    if (pendingDocuments.length === 0) {
      // No pending documents, just trigger validation
      validateDocuments();
      return;
    }

    setIsProcessing(true);

    try {
      // Process each pending document in sequence
      for (const [type, state] of pendingDocuments) {
        if (state.cachedFile) {
          setProcessingStep(type as DocumentType);
          await processDocument(type as DocumentType);
          
          // Add small delay to avoid API rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // All documents processed, trigger validation
      setProcessingStep(null);
      validateDocuments();

    } catch (error) {
      console.error("Document processing error:", error);
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  return {
    documents,
    isProcessing,
    processingStep,
    handleFileUpload,
    processDocuments
  };
} 