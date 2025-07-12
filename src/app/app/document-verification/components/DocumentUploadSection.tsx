import React from 'react';
import { UploadedFile } from '@/components/ui/multi-file-uploader';
import { SingleFileData } from '@/components/ui/single-file-uploader';
import { MultiFileUploader } from '@/components/ui/multi-file-uploader';
import { SingleFileUploader } from '@/components/ui/single-file-uploader';
import { documentConfigs } from '../constants/documentConfigs';

interface DocumentUploadSectionProps {
  multiFiles: Record<'mvr' | 'autoplus', UploadedFile[]>;
  singleFiles: Record<'quote' | 'application', SingleFileData>;
  onMultiFilesChange: (type: 'mvr' | 'autoplus', files: UploadedFile[]) => void;
  onSingleFileChange: (type: 'quote' | 'application', fileData: SingleFileData) => void;
}

export const DocumentUploadSection: React.FC<DocumentUploadSectionProps> = ({
  multiFiles,
  singleFiles,
  onMultiFilesChange,
  onSingleFileChange
}) => {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Document Upload</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {documentConfigs.map((config) => {
          if (config.isMultiFile) {
            const files = multiFiles[config.type as 'mvr' | 'autoplus'];
            return (
              <MultiFileUploader
                key={config.type}
                title={config.title}
                description={config.description}
                icon={config.icon}
                color={config.color}
                files={files}
                onFilesChange={(newFiles) => {
                  onMultiFilesChange(config.type as 'mvr' | 'autoplus', newFiles);
                }}
              />
            );
          } else {
            const fileData = singleFiles[config.type as 'quote' | 'application'];
            return (
              <SingleFileUploader
                key={config.type}
                title={config.title}
                description={config.description}
                icon={config.icon}
                color={config.color}
                fileData={fileData}
                onFileChange={(newFileData) => {
                  onSingleFileChange(config.type as 'quote' | 'application', newFileData);
                }}
              />
            );
          }
        })}
      </div>
    </div>
  );
}; 