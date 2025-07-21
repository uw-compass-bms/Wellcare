'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toast } from '@/lib/utils/toast';
import { Loader2 } from 'lucide-react';

export default function TestSignaturePage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState('');
  const [recipients, setRecipients] = useState<any[]>([]);

  const findPendingTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/signature/test/pending-tasks');
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        const task = result.data[0];
        setTaskId(task.id);
        setRecipients(task.recipients);
        Toast.success(`Found ${result.data.length} tasks with pending signatures`);
      } else {
        Toast.error('No tasks with pending signatures found');
      }
    } catch (error) {
      Toast.error('Failed to find pending tasks');
    } finally {
      setLoading(false);
    }
  };

  const getSignatureUrl = (token: string) => {
    return `${window.location.origin}/sign/${token}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Signature Flow</h1>
      
      <div className="space-y-6">
        {/* Step 1: Find pending tasks */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Step 1: Find Tasks with Pending Signatures</h2>
          <Button onClick={findPendingTasks} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Find Pending Tasks'
            )}
          </Button>
        </div>

        {/* Step 2: Show recipients */}
        {recipients.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Step 2: Recipients with Tokens</h2>
            <div className="space-y-3">
              {recipients.map((recipient) => (
                <div key={recipient.id} className="border p-4 rounded">
                  <p className="font-medium">{recipient.name} ({recipient.email})</p>
                  <p className="text-sm text-gray-600">Status: {recipient.status}</p>
                  {recipient.token && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-1">Signature URL:</p>
                      <div className="flex gap-2">
                        <Input 
                          value={getSignatureUrl(recipient.token)} 
                          readOnly 
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(getSignatureUrl(recipient.token));
                            Toast.success('URL copied to clipboard');
                          }}
                        >
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(getSignatureUrl(recipient.token), '_blank')}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Manual token input */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Step 3: Or Enter Token Manually</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Enter signature token..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Button
              onClick={() => {
                if (token) {
                  window.open(getSignatureUrl(token), '_blank');
                }
              }}
              disabled={!token}
            >
              Open Signature Page
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h3 className="font-semibold mb-2">Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Click "Find Pending Tasks" to get tasks that have pending signatures</li>
            <li>Copy or open the signature URL for any recipient</li>
            <li>On the signature page, click on fields to add signatures/text</li>
            <li>Submit the signature and check if the status updates</li>
            <li>Check your email (uw.compass.bms@gmail.com in dev mode) for confirmation</li>
          </ol>
        </div>
      </div>
    </div>
  );
}