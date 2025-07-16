'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Trash2, Download } from 'lucide-react';

interface FileInfo {
  id: string;
  originalFilename: string;
  displayName: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
}

interface DocumentUploadProps {
  taskId: string;
  files: FileInfo[];
  onFileUploaded: (fileInfo: FileInfo) => void;
  onFileDeleted: (fileId: string) => void;
}

export default function DocumentUpload({
  taskId,
  files,
  onFileUploaded,
  onFileDeleted
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  console.log('DocumentUpload render - uploading:', uploading, 'taskId:', taskId);

  // 处理文件选择
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    console.log('file select event:', selectedFiles);
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        if (!file.type.includes('pdf') && !file.type.includes('image')) {
          alert(`${file.name} is not supported`);
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name} exceeds 10MB limit`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('taskId', taskId);

        const response = await fetch('/api/signature/files', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          onFileUploaded(result.data);
        } else {
          const error = await response.json();
          alert(`Upload failed: ${error.error}`);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }, [taskId, onFileUploaded]);

  // 删除文件
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Delete this file?')) return;

    setDeleting(fileId);
    try {
      const response = await fetch(`/api/signature/files/${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onFileDeleted(fileId);
      } else {
        alert('Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  // 下载文件
  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/signature/files/${fileId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Upload PDF or image files</h3>
          <p className="text-sm text-gray-600">PDF, JPG, JPEG, PNG • Max 10MB</p>
        </div>
        
        <label className="cursor-pointer">
          <input
            ref={(el) => { if (el) (window as any).fileInput = el; }}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            onClick={() => console.log('input clicked')}
          />
          <button
            type="button"
            disabled={uploading}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
            onClick={(e) => {
              console.log('button clicked');
              e.preventDefault();
              const input = document.querySelector('input[type="file"]') as HTMLInputElement;
              if (input) input.click();
            }}
          >
            {uploading ? 'Uploading...' : 'Select Files'}
          </button>
        </label>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Files ({files.length})</h4>
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-red-500" />
                <div>
                  <p className="font-medium text-gray-900">{file.displayName || file.originalFilename}</p>
                  <p className="text-sm text-gray-500">Uploaded</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadFile(file.id, file.originalFilename)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteFile(file.id)}
                  disabled={deleting === file.id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 transition-colors"
                  title="Delete file"
                >
                  {deleting === file.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {files.length === 0 && (
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">No files uploaded yet</p>
        </div>
      )}
    </div>
  );
}
