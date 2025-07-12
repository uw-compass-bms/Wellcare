import { FileText } from 'lucide-react';

// 文档配置类型
export interface DocumentConfig {
  type: 'mvr' | 'autoplus' | 'quote' | 'application';
  title: string;
  description: string;
  icon: typeof FileText;
  color: 'blue' | 'green' | 'purple' | 'orange';
  isMultiFile: boolean;
}

// 文档配置常量
export const documentConfigs: DocumentConfig[] = [
  { 
    type: 'mvr', 
    title: 'MVR Reports', 
    description: 'Motor Vehicle Records',
    icon: FileText,
    color: 'blue',
    isMultiFile: true
  },
  { 
    type: 'autoplus', 
    title: 'Auto+ Reports', 
    description: 'Insurance History',
    icon: FileText,
    color: 'green',
    isMultiFile: true
  },
  { 
    type: 'quote', 
    title: 'Quote Document', 
    description: 'Insurance Quote',
    icon: FileText,
    color: 'purple',
    isMultiFile: false
  },
  { 
    type: 'application', 
    title: 'Application Form', 
    description: 'OAF-1 Form',
    icon: FileText,
    color: 'orange',
    isMultiFile: false
  }
]; 