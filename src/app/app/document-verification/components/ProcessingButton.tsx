import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Loader2 } from 'lucide-react';

interface ProcessingButtonProps {
  isProcessing: boolean;
  totalFiles: number;
  pendingFiles: number;
  onProcessAllFiles: () => void;
}

export const ProcessingButton: React.FC<ProcessingButtonProps> = ({
  isProcessing,
  totalFiles,
  pendingFiles,
  onProcessAllFiles
}) => {
  if (totalFiles === 0) {
    return null;
  }

  return (
    <div className="flex justify-end mt-6">
      <Button
        onClick={onProcessAllFiles}
        disabled={isProcessing || pendingFiles === 0}
        className="px-8 py-2"
        size="lg"
        variant={pendingFiles > 0 ? "default" : "secondary"}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            {pendingFiles > 0 ? `Process ${pendingFiles} Files` : 'All Files Processed'}
          </>
        )}
      </Button>
    </div>
  );
}; 