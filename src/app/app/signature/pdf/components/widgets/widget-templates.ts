/**
 * Widget模板配置
 */

import { WidgetTemplate, WidgetType } from '../../types';

export const WIDGET_TEMPLATES: Record<WidgetType, WidgetTemplate> = {
  signature: {
    type: 'signature',
    label: 'Signature',
    icon: '✍️',
    color: '#3B82F6', // blue-500
    defaultSize: { width: 20, height: 8 },
    minSize: { width: 10, height: 4 }
  },
  date: {
    type: 'date',
    label: 'Date',
    icon: '📅',
    color: '#10B981', // green-500
    defaultSize: { width: 15, height: 6 },
    minSize: { width: 8, height: 4 }
  },
  text: {
    type: 'text',
    label: 'Text',
    icon: '📝',
    color: '#F59E0B', // amber-500
    defaultSize: { width: 25, height: 6 },
    minSize: { width: 10, height: 4 }
  },
  name: {
    type: 'name',
    label: 'Name',
    icon: '👤',
    color: '#8B5CF6', // violet-500
    defaultSize: { width: 20, height: 6 },
    minSize: { width: 10, height: 4 }
  },
  email: {
    type: 'email',
    label: 'Email',
    icon: '✉️',
    color: '#EF4444', // red-500
    defaultSize: { width: 28, height: 6 },
    minSize: { width: 15, height: 4 }
  },
  initials: {
    type: 'initials',
    label: 'Initials',
    icon: '🆔',
    color: '#06B6D4', // cyan-500
    defaultSize: { width: 12, height: 6 },
    minSize: { width: 6, height: 4 }
  }
};

export const getWidgetTemplate = (type: WidgetType): WidgetTemplate => {
  return WIDGET_TEMPLATES[type];
};

export const getAllWidgetTemplates = (): WidgetTemplate[] => {
  return Object.values(WIDGET_TEMPLATES);
};