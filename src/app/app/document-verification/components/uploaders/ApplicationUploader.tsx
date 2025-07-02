"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCheck, Clock } from 'lucide-react';
import { DocumentState } from '../../types';

interface ApplicationUploaderProps {
  documentState: DocumentState;
  onFileUpload: (file: File) => Promise<void>;
}

export default function ApplicationUploader(_props: ApplicationUploaderProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow border-gray-200 opacity-75">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileCheck className="w-8 h-8 text-orange-600" />
        </div>
        <CardTitle className="text-lg">Application Forms</CardTitle>
        <CardDescription>Insurance application documents</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="space-y-3">
          <Button 
            className="w-full" 
            disabled 
            variant="outline"
          >
            <Clock className="w-4 h-4 mr-2" />
            Coming Soon
          </Button>
          
          <p className="text-xs text-gray-500">
            Application processing will be available soon
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 