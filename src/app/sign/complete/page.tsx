import React from 'react';
import { Check } from 'lucide-react';

export default function SignCompletePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
        <p className="text-gray-600 mb-6">
          Your signature has been successfully recorded.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700">
            You will receive a confirmation email shortly. Once all parties have signed, 
            you'll receive a copy of the fully executed document.
          </p>
        </div>
        
        <p className="text-sm text-gray-500">
          You can now close this window.
        </p>
      </div>
    </div>
  );
}