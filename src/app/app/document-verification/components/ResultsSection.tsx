import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { documentConfigs } from '../constants/documentConfigs';

interface ResultsSectionProps {
  processedResults: Record<string, any>;
  hasResults: boolean;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  processedResults,
  hasResults
}) => {
  if (!hasResults) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 text-center">Extraction Results</h2>
      
      {Object.entries(processedResults).map(([type, data]) => {
        const config = documentConfigs.find(c => c.type === type);
        if (!config) return null;

        return (
          <Card key={type} className="overflow-hidden">
            <CardHeader className="bg-gray-50">
              <CardTitle className="flex items-center">
                <config.icon className="w-5 h-5 mr-2 text-gray-700" />
                {config.title} - Extracted Data
                {Array.isArray(data) && ` (${data.length} files)`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="bg-white p-6 overflow-auto text-sm border-0 max-h-96">
                {JSON.stringify(data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}; 