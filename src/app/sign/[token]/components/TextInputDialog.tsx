'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface TextInputDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  initialValue?: string;
}

export function TextInputDialog({ open, onClose, onSave, initialValue = '' }: TextInputDialogProps) {
  const [text, setText] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setText(initialValue);
    }
  }, [open, initialValue]);

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && text.trim()) {
      handleSave();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Enter Text</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4">
          <Input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter text here..."
            className="w-full"
            autoFocus
          />
          <p className="text-sm text-gray-600 mt-2">
            Enter the text for this field.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!text.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}