'use client';

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SignatureSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Document Signed Successfully!
          </h1>
          <p className="text-gray-600 mb-6">
            Thank you for signing the document. You will receive a confirmation email shortly with a copy of the signed document.
          </p>
          <Button
            onClick={() => window.close()}
            variant="outline"
            className="w-full"
          >
            Close Window
          </Button>
        </div>
      </div>
    </div>
  );
}