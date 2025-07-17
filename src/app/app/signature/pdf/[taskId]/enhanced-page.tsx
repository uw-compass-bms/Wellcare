'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Send, Download } from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Import enhanced components
import EnhancedDragWidgets, { WidgetType } from '../components/enhanced-drag-widgets';
import EnhancedPDFViewer from '../components/enhanced-pdf-viewer';
import { 
  SignaturePositionData, 
  PDFDimensions, 
  generateUniqueKey 
} from '@/lib/utils/coordinates-enhanced';
import { 
  SignatureElement, 
  EmbedSignatureOptions,
  embedSignaturesInPDF 
} from '@/lib/pdf/signature-embedder-enhanced';

// Import API services
import {
  getRecipientPositions,
  createSignaturePosition,
  updateSignaturePosition,
  deleteSignaturePosition,
  CreatePositionRequest
} from '@/lib/api/signature-positions';
import { Toast } from '@/lib/utils/toast';

interface FileInfo {
  id: string;
  originalFilename: string;
  displayName: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
  supabaseUrl: string;
}

interface RecipientInfo {
  id: string;
  name: string;
  email: string;
  status: string;
}

const EnhancedSignaturePage: React.FC = () => {
  const { taskId } = useParams();
  const router = useRouter();

  // Core state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Data state
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [recipients, setRecipients] = useState<RecipientInfo[]>([]);
  const [signaturePositions, setSignaturePositions] = useState<SignaturePositionData[]>([]);
  
  // UI state
  const [currentFileId, setCurrentFileId] = useState<string>('');
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [selectedPosition, setSelectedPosition] = useState<SignaturePositionData | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [draggedWidgetType, setDraggedWidgetType] = useState<WidgetType | null>(null);
  const [scale, setScale] = useState(1);
  const [pdfDimensions, setPdfDimensions] = useState<PDFDimensions[]>([]);

  // Load task data on mount
  useEffect(() => {
    if (taskId) {
      loadTaskData(taskId as string);
    }
  }, [taskId]);

  // Load task data including files, recipients, and positions
  const loadTaskData = async (taskId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Load task details
      const taskResponse = await fetch(`/api/signature/tasks/${taskId}`);
      if (!taskResponse.ok) {
        throw new Error('Failed to load task details');
      }
      const taskData = await taskResponse.json();
      
      // Load files for this task
      const filesResponse = await fetch(`/api/signature/tasks/${taskId}/files`);
      if (!filesResponse.ok) {
        throw new Error('Failed to load files');
      }
      const filesData = await filesResponse.json();
      
      // Load recipients for this task
      const recipientsResponse = await fetch(`/api/signature/tasks/${taskId}/recipients`);
      if (!recipientsResponse.ok) {
        throw new Error('Failed to load recipients');
      }
      const recipientsData = await recipientsResponse.json();

      // Process files data
      const processedFiles: FileInfo[] = filesData.data?.map((file: any) => ({
        id: file.id,
        originalFilename: file.original_filename || file.originalFilename,
        displayName: file.display_name || file.displayName || file.original_filename,
        fileSize: file.file_size || file.fileSize || 0,
        status: file.status || 'active',
        uploadedAt: file.uploaded_at || file.uploadedAt || new Date().toISOString(),
        supabaseUrl: file.supabase_url || file.supabaseUrl || ''
      })) || [];

      // Process recipients data
      const processedRecipients: RecipientInfo[] = recipientsData.data?.map((recipient: any) => ({
        id: recipient.id,
        name: recipient.name,
        email: recipient.email,
        status: recipient.status || 'pending'
      })) || [];

      setFiles(processedFiles);
      setRecipients(processedRecipients);
      
      if (processedFiles.length > 0) {
        setCurrentFileId(processedFiles[0].id);
      }
      
      if (processedRecipients.length > 0) {
        setSelectedRecipientId(processedRecipients[0].id);
        // Load existing positions for the first recipient
        await loadSignaturePositions(processedRecipients[0].id);
      }

    } catch (err) {
      console.error('Failed to load task data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load task data');
    } finally {
      setLoading(false);
    }
  };

  // Load signature positions for a recipient
  const loadSignaturePositions = async (recipientId: string) => {
    try {
      console.log('Loading signature positions for recipient:', recipientId);
      const response = await getRecipientPositions(recipientId);
      
      if (!response.success) {
        console.warn('Failed to load positions:', response.error);
        Toast.warning(`Failed to load signature positions: ${response.error}`);
        setSignaturePositions([]);
        return;
      }

      if (!response.data || response.data.length === 0) {
        console.log('No positions found for recipient:', recipientId);
        setSignaturePositions([]);
        return;
      }

      // Convert API positions to enhanced format
      const enhancedPositions: SignaturePositionData[] = response.data.map(pos => ({
        key: pos.id || generateUniqueKey(),
        type: 'signature', // Default type, should be enhanced based on API
        xPosition: pos.x,
        yPosition: pos.y,
        Width: pos.width,
        Height: pos.height,
        pageNumber: pos.pageNumber,
        signerObjId: recipientId,
        scale: 1,
        zIndex: Date.now(),
        // Add required enhanced coordinates fields
        widthPercent: (pos.width / 595) * 100, // Calculate percentage
        heightPercent: (pos.height / 842) * 100, // Calculate percentage
        pageWidth: 595, // A4 default, should be from PDF dimensions
        pageHeight: 842, // A4 default, should be from PDF dimensions
        options: {
          fontSize: 12,
          fontColor: 'black',
          placeholder: pos.placeholderText || 'Click to sign'
        }
      }));

      console.log('Loaded positions:', enhancedPositions);
      setSignaturePositions(enhancedPositions);
    } catch (error) {
      console.error('Failed to load signature positions:', error);
      Toast.error('Failed to load signature positions');
      setSignaturePositions([]);
    }
  };

  // Handle widget drag start
  const handleWidgetDragStart = useCallback((widgetType: WidgetType) => {
    setDraggedWidgetType(widgetType);
  }, []);

  // Handle widget drag end
  const handleWidgetDragEnd = useCallback(() => {
    setDraggedWidgetType(null);
  }, []);

  // Handle widget click (add to center)
  const handleWidgetClick = useCallback((widgetType: WidgetType) => {
    if (!selectedRecipientId) {
      Toast.warning('Please select a recipient first');
      return;
    }

    // Add widget to center of current page
    const newPosition: SignaturePositionData = {
      key: generateUniqueKey(),
      type: widgetType,
      xPosition: 200, // Center-ish position
      yPosition: 300,
      Width: 150,
      Height: 50,
      pageNumber: currentPageNumber,
      signerObjId: selectedRecipientId,
      scale: 1,
      zIndex: Date.now(),
      options: {
        fontSize: 12,
        fontColor: 'black',
        placeholder: `Click to ${widgetType}`
      }
    };

    handlePositionAdd(newPosition);
  }, [selectedRecipientId, currentPageNumber]);

  // Handle position selection
  const handlePositionSelect = useCallback((position: SignaturePositionData | null) => {
    setSelectedPosition(position);
  }, []);

  // Handle position addition
  const handlePositionAdd = useCallback(async (newPosition: Omit<SignaturePositionData, 'key'>) => {
    try {
      setSaving(true);
      
      const position: SignaturePositionData = {
        ...newPosition,
        key: generateUniqueKey()
      };

      // Save to API
      const apiPosition: CreatePositionRequest = {
        recipientId: position.signerObjId || selectedRecipientId,
        fileId: currentFileId,
        pageNumber: position.pageNumber,
        x: position.xPosition,
        y: position.yPosition,
        width: position.Width,
        height: position.Height,
        placeholderText: position.options?.placeholder || `Click to ${position.type}`,
        pageWidth: position.pageWidth || 595,
        pageHeight: position.pageHeight || 842
      };

      const response = await createSignaturePosition(apiPosition);
      
      if (response.success && response.data?.id) {
        position.key = response.data.id;
      } else {
        throw new Error(response.error || 'Failed to create position');
      }

      setSignaturePositions(prev => [...prev, position]);
      setSelectedPosition(position);
      Toast.success('Signature position added successfully');

    } catch (error) {
      console.error('Failed to add position:', error);
      Toast.error('Failed to add signature position');
    } finally {
      setSaving(false);
    }
  }, [currentFileId, selectedRecipientId]);

  // Handle position update
  const handlePositionUpdate = useCallback(async (updatedPosition: SignaturePositionData) => {
    try {
      setSaving(true);

      // Update in API
      const apiUpdate = {
        recipientId: updatedPosition.signerObjId || selectedRecipientId,
        fileId: currentFileId,
        pageNumber: updatedPosition.pageNumber,
        x: updatedPosition.xPosition,
        y: updatedPosition.yPosition,
        width: updatedPosition.Width,
        height: updatedPosition.Height,
        placeholderText: updatedPosition.options?.placeholder || `Click to ${updatedPosition.type}`,
        pageWidth: updatedPosition.pageWidth || 595,
        pageHeight: updatedPosition.pageHeight || 842
      };

      const response = await updateSignaturePosition(updatedPosition.key, apiUpdate);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update position');
      }

      // Update local state
      setSignaturePositions(prev => 
        prev.map(pos => pos.key === updatedPosition.key ? updatedPosition : pos)
      );
      Toast.success('Signature position updated successfully');

    } catch (error) {
      console.error('Failed to update position:', error);
      Toast.error('Failed to update signature position');
    } finally {
      setSaving(false);
    }
  }, [selectedRecipientId, currentFileId]);

  // Handle position deletion
  const handlePositionDelete = useCallback(async (positionId: string) => {
    try {
      setSaving(true);

      const response = await deleteSignaturePosition(positionId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete position');
      }

      setSignaturePositions(prev => prev.filter(pos => pos.key !== positionId));
      
      if (selectedPosition?.key === positionId) {
        setSelectedPosition(null);
      }
      Toast.success('Signature position deleted successfully');

    } catch (error) {
      console.error('Failed to delete position:', error);
      Toast.error('Failed to delete signature position');
    } finally {
      setSaving(false);
    }
  }, [selectedPosition]);

  // Handle page change
  const handlePageChange = useCallback((pageNumber: number) => {
    setCurrentPageNumber(pageNumber);
    setSelectedPosition(null); // Clear selection when changing pages
  }, []);

  // Handle recipient change
  const handleRecipientChange = useCallback(async (recipientId: string) => {
    setSelectedRecipientId(recipientId);
    setSelectedPosition(null);
    await loadSignaturePositions(recipientId);
  }, []);

  // Save all positions
  const handleSaveAll = useCallback(async () => {
    try {
      setSaving(true);
      
      // In a real implementation, you might batch save all positions
      console.log('Saving all positions:', signaturePositions);
      
      Toast.success('All positions saved successfully!');
      
    } catch (error) {
      console.error('Failed to save all positions:', error);
      Toast.error('Failed to save positions');
    } finally {
      setSaving(false);
    }
  }, [signaturePositions]);

  // Generate final PDF with signatures
  const handleGeneratePDF = useCallback(async () => {
    if (!currentFileId || signaturePositions.length === 0) {
      Toast.warning('No signature positions to embed');
      return;
    }

    try {
      setSaving(true);
      
      const currentFile = files.find(f => f.id === currentFileId);
      if (!currentFile) {
        throw new Error('Current file not found');
      }

      // Prepare signature elements for PDF generation API
      const signatureElements = signaturePositions.map(position => ({
        id: position.key,
        recipientId: position.signerObjId || selectedRecipientId,
        type: position.type,
        pageNumber: position.pageNumber,
        x: position.xPosition,
        y: position.yPosition,
        width: position.Width,
        height: position.Height,
        content: position.options?.placeholder || `[${position.type}]`,
        fontSize: position.options?.fontSize || 12,
        fontColor: position.options?.fontColor || 'black'
      }));

      // Call PDF generation API
      const response = await fetch('/api/signature/pdf/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: taskId,
          fileId: currentFileId,
          signatures: signatureElements,
          outputFileName: `signed_${currentFile.originalFilename}`,
          options: {
            embedMode: 'overlay',
            quality: 'high',
            preserveMetadata: true
          }
        })
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Download the generated PDF
        const link = document.createElement('a');
        link.href = result.data.downloadUrl;
        link.download = result.data.fileName;
        link.click();
        
        Toast.success(`PDF generated successfully! File size: ${(result.data.fileSize / 1024).toFixed(1)} KB`);
      } else {
        throw new Error(result.error || 'Failed to generate PDF');
      }

    } catch (error) {
      console.error('Failed to generate PDF:', error);
      Toast.error('Failed to generate PDF');
    } finally {
      setSaving(false);
    }
  }, [currentFileId, files, signaturePositions, selectedRecipientId, taskId]);

  // Handle sending for signing
  const handleSendForSigning = useCallback(async () => {
    if (!taskId || recipients.length === 0) {
      Toast.warning('No recipients to send to');
      return;
    }

    try {
      setSaving(true);
      
      // Call email sending API
      const response = await fetch('/api/signature/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: taskId,
          recipientIds: recipients.map(r => r.id),
          customMessage: 'Please review and sign the attached document.',
          companyName: 'Your Company Name', // Could be from user profile
          expiryDays: 30,
          testMode: false
        })
      });

      const result = await response.json();

      if (result.success) {
        const { sentCount, failedCount, skippedCount } = result;
        
        if (sentCount > 0) {
          Toast.success(`Successfully sent signature requests to ${sentCount} recipients!`);
        }
        
        if (failedCount > 0) {
          Toast.error(`Failed to send to ${failedCount} recipients. Please check the console for details.`);
        }
        
        if (skippedCount > 0) {
          Toast.warning(`Skipped ${skippedCount} recipients (already signed or invalid status).`);
        }
        
        // Optionally reload task data to update recipient statuses
        await loadTaskData(taskId as string);
        
      } else {
        throw new Error(result.error || 'Failed to send signature requests');
      }

    } catch (error) {
      console.error('Failed to send signature requests:', error);
      Toast.error('Failed to send signature requests');
    } finally {
      setSaving(false);
    }
  }, [taskId, recipients, loadTaskData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading signature task...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{error}</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">Enhanced Signature Setup</h1>
                  <p className="text-sm text-gray-600">
                    {files.length > 0 ? files[0].displayName : 'No file selected'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save All'}
                </Button>
                <Button
                  onClick={handleGeneratePDF}
                  disabled={saving || signaturePositions.length === 0}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Generate PDF
                </Button>
                <Button
                  variant="default"
                  onClick={handleSendForSigning}
                  disabled={saving || recipients.length === 0}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send for Signing
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[800px]">
            {/* Left sidebar - Drag widgets */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border h-fit">
                {/* Recipient selector */}
                <div className="p-4 border-b">
                  <label className="block text-sm font-medium mb-2">
                    Select Recipient
                  </label>
                  <select
                    value={selectedRecipientId}
                    onChange={(e) => handleRecipientChange(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    {recipients.map(recipient => (
                      <option key={recipient.id} value={recipient.id}>
                        {recipient.name} ({recipient.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Drag widgets */}
                <EnhancedDragWidgets
                  onDragStart={handleWidgetDragStart}
                  onDragEnd={handleWidgetDragEnd}
                  onWidgetClick={handleWidgetClick}
                  disabledWidgets={[]}
                />

                {/* Position info */}
                {selectedPosition && (
                  <div className="p-4 border-t bg-gray-50">
                    <h4 className="font-medium text-sm mb-2">Selected Position</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>Type: {selectedPosition.type}</div>
                      <div>Page: {selectedPosition.pageNumber}</div>
                      <div>X: {Math.round(selectedPosition.xPosition)}</div>
                      <div>Y: {Math.round(selectedPosition.yPosition)}</div>
                      <div>Size: {Math.round(selectedPosition.Width)} × {Math.round(selectedPosition.Height)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Center - PDF viewer */}
            <div className="lg:col-span-3">
              <EnhancedPDFViewer
                files={files}
                recipients={recipients}
                currentFileId={currentFileId}
                currentPageNumber={currentPageNumber}
                positions={signaturePositions}
                selectedPosition={selectedPosition}
                selectedRecipientId={selectedRecipientId}
                onPositionSelect={handlePositionSelect}
                onPositionUpdate={handlePositionUpdate}
                onPositionDelete={handlePositionDelete}
                onPositionAdd={handlePositionAdd}
                onPageChange={handlePageChange}
                draggedWidgetType={draggedWidgetType}
                scale={scale}
                pdfDimensions={pdfDimensions}
              />
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default EnhancedSignaturePage; 