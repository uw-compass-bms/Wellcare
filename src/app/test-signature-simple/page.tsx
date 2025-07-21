'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toast } from '@/lib/utils/toast';
import { Loader2, Copy, ExternalLink } from 'lucide-react';

export default function TestSignatureSimplePage() {
  const [loading, setLoading] = useState(false);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);

  const findPendingRecipients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test/pending-recipients');
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        setRecipients(result.data);
        Toast.success(`Found ${result.data.length} pending recipients`);
      } else {
        Toast.error('No pending recipients found');
      }
    } catch (error) {
      Toast.error('Failed to find pending recipients');
    } finally {
      setLoading(false);
    }
  };

  const testSignatureFlow = async (recipient: any) => {
    setSelectedRecipient(recipient);
    const signatureUrl = `${window.location.origin}/sign/${recipient.token}`;
    window.open(signatureUrl, '_blank');
  };

  const createTestData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test/create-test-signature-task', {
        method: 'POST',
      });
      const result = await response.json();
      
      if (result.success) {
        Toast.success('Test task created successfully');
        findPendingRecipients();
      } else {
        Toast.error(result.error || 'Failed to create test task');
      }
    } catch (error) {
      Toast.error('Failed to create test data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Simple Signature Test</h1>
      
      <div className="space-y-6">
        {/* Step 1: Create test data */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Step 1: Create Test Data (Optional)</h2>
          <p className="text-sm text-gray-600 mb-4">
            This will create a test signature task with sample recipients and fields.
          </p>
          <Button onClick={createTestData} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Test Task'
            )}
          </Button>
        </div>

        {/* Step 2: Find pending recipients */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Step 2: Find Pending Recipients</h2>
          <Button onClick={findPendingRecipients} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Find Pending Recipients'
            )}
          </Button>
        </div>

        {/* Step 3: Show recipients */}
        {recipients.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Step 3: Test Signature</h2>
            <div className="space-y-3">
              {recipients.map((recipient) => (
                <div key={recipient.id} className="border p-4 rounded hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{recipient.name}</p>
                      <p className="text-sm text-gray-600">{recipient.email}</p>
                      <p className="text-sm text-gray-500">
                        Task: {recipient.task_title} | Status: {recipient.status}
                      </p>
                      <p className="text-sm text-gray-500">
                        Fields to sign: {recipient.field_count || 0}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => testSignatureFlow(recipient)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Test Sign
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Create a test task (optional) or use existing tasks</li>
            <li>Find pending recipients</li>
            <li>Click "Test Sign" to open the signature page</li>
            <li>On the signature page, click fields to sign/fill them</li>
            <li>Submit when done</li>
          </ol>
          <p className="mt-4 text-sm font-semibold">
            Note: In dev mode, all emails go to uw.compass.bms@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
}