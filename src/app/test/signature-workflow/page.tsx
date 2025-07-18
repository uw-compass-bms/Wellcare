'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignatureWorkflowTestPage() {
  const router = useRouter();
  const [taskId, setTaskId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testWorkflow = async () => {
    if (!taskId) {
      setError('Please enter a task ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/test/signature-workflow?taskId=${taskId}`);
      const data = await response.json();

      if (response.ok) {
        setResult(data.data);
      } else {
        setError(data.error || 'Test failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async (recipientId?: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/signature/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          recipientIds: recipientId ? [recipientId] : undefined,
          testMode: false
        })
      });

      const data = await response.json();
      alert(data.success ? 'Email sent successfully!' : `Failed: ${data.error}`);
    } catch (err) {
      alert('Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!taskId) return;
    
    window.open(`/api/signature/tasks/${taskId}/generate-pdf`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Signature Workflow Test</h1>

        {/* Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium mb-2">Task ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="Enter task ID"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={testWorkflow}
              disabled={loading}
              className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Workflow'}
            </button>
          </div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Task Summary */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Task Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Title</p>
                  <p className="font-medium">{result.task.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="font-medium capitalize">{result.task.status}</p>
                </div>
              </div>
            </div>

            {/* Recipients */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Recipients ({result.recipients.total})</h2>
              <div className="space-y-3">
                {result.recipients.publicUrls.map((recipient: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{recipient.recipientName}</p>
                        <p className="text-sm text-gray-600">{recipient.recipientEmail}</p>
                        <p className="text-sm">
                          Status: <span className={`font-medium ${recipient.status === 'signed' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {recipient.status}
                          </span>
                        </p>
                      </div>
                      {recipient.status === 'pending' && recipient.signUrl && (
                        <div className="text-right">
                          <a
                            href={recipient.signUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:underline text-sm"
                          >
                            Open Sign Page →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => sendTestEmail()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Send Email to All Pending Recipients
              </button>
            </div>

            {/* Files */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Files ({result.files.total})</h2>
              <div className="space-y-2">
                {result.files.list.map((file: any) => (
                  <div key={file.id} className="flex justify-between items-center py-2">
                    <span>{file.name}</span>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:underline text-sm"
                    >
                      View →
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Positions */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Signature Positions</h2>
              <p className="text-sm text-gray-600 mb-3">
                Total: {result.positions.total} | 
                Pending: {result.positions.pending} | 
                Signed: {result.positions.signed}
              </p>
              <div className="space-y-2">
                {result.positions.byRecipient.map((item: any, index: number) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{item.recipientName}:</span> {item.signedPositions}/{item.totalPositions} signed
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={generatePDF}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Generate Signed PDF
                </button>
                <button
                  onClick={() => router.push(`/app/signature/pdf/${taskId}`)}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Back to Editor
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}