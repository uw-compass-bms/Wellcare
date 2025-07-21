'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { ProductionSignatureViewer } from './components/ProductionSignatureViewer';
import { Toast } from '@/lib/utils/toast';

interface TokenData {
  recipient: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
  task: {
    id: string;
    title: string;
    description?: string;
  };
  files: Array<{
    id: string;
    name: string;
    url: string;
    order: number;
  }>;
  fields: Array<any>;
  expiresAt: string;
}

export default function SignaturePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadySigned, setAlreadySigned] = useState(false);

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/signature/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.alreadySigned) {
          setAlreadySigned(true);
        }
        setError(result.error || 'Failed to verify token');
        return;
      }

      setTokenData(result.data);
    } catch (err) {
      console.error('Token verification error:', err);
      setError('Failed to verify token');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying signature link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            {alreadySigned ? (
              <>
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Already Signed</h2>
                <p className="text-gray-600 mb-6">
                  You have already signed this document. Thank you!
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Invalid Link</h2>
                <p className="text-gray-600 mb-6">{error}</p>
              </>
            )}
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

  if (!tokenData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {tokenData.task.title}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Signature requested for: {tokenData.recipient.name} ({tokenData.recipient.email})
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Expires: {new Date(tokenData.expiresAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <ProductionSignatureViewer
          token={token}
          tokenData={tokenData}
        />
      </div>
    </div>
  );
}