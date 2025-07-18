'use client';

import { PDFSignatureLayout } from '../components';

// 模拟数据，用于演示系统功能
const DEMO_TASK = {
  id: 'demo-task-001',
  title: 'Sample Contract Agreement',
  status: 'draft'
};

const DEMO_FILES = [
  {
    id: 'demo-file-001',
    displayName: 'Sample Contract.pdf',
    originalFilename: 'sample-contract.pdf',
    supabaseUrl: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf', // 使用公开的示例PDF
    pageCount: 14
  }
];

const DEMO_RECIPIENTS = [
  {
    id: 'demo-recipient-001',
    name: 'John Smith',
    email: 'john.smith@example.com',
    status: 'pending'
  },
  {
    id: 'demo-recipient-002', 
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    status: 'pending'
  }
];

interface DemoModeProps {
  taskId: string;
}

export default function DemoMode({ taskId }: DemoModeProps) {
  const handleSave = async (widgets: any[]) => {
    console.log('Demo mode: Saving widgets:', widgets);
    // 在实际应用中，这里会保存到数据库
    alert(`Demo mode: Saved ${widgets.length} signature fields!`);
  };

  const handleSend = async () => {
    console.log('Demo mode: Sending for signature');
    alert('Demo mode: Emails would be sent to recipients in production!');
  };

  return (
    <div className="relative">
      {/* Demo mode banner */}
      <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2">
        <div className="flex items-center justify-center text-yellow-800 text-sm">
          <span className="font-medium">Demo Mode</span>
          <span className="mx-2">•</span>
          <span>This is a demonstration of the PDF signature system</span>
        </div>
      </div>

      <PDFSignatureLayout
        taskId={taskId}
        files={DEMO_FILES}
        recipients={DEMO_RECIPIENTS}
        onSave={handleSave}
        onSend={handleSend}
      />
    </div>
  );
}