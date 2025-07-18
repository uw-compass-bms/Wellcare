# PDF Signature System

## Overview
This module provides a complete PDF signature field placement system with drag-and-drop functionality, API integration, and mobile responsiveness.

## Main Component

### ResponsiveSignatureCanvas
The production-ready component that handles all signature field operations.

```typescript
import { ResponsiveSignatureCanvas } from '@/app/signature/pdf/components';

<ResponsiveSignatureCanvas
  taskId="task-123"
  fileUrl="https://example.com/document.pdf"
  fileId="file-123"
  recipientId="recipient-123"
/>
```

## Features

- **Click to Place**: Select a field type and click on the PDF to place it
- **Drag & Drop**: Move fields by dragging, resize using corners
- **Mobile Responsive**: Touch-optimized interface for mobile devices
- **API Integration**: Automatic saving to database
- **Undo/Redo**: Full history management with keyboard shortcuts
- **Copy/Paste**: Duplicate fields easily
- **Performance Optimized**: Field virtualization for large documents

## API Endpoints

The component integrates with these endpoints:
- `GET /api/signature/positions?taskId={taskId}` - Fetch existing fields
- `POST /api/signature/positions` - Create new field
- `PUT /api/signature/positions/{id}` - Update field position/size
- `DELETE /api/signature/positions/{id}` - Remove field

## Field Types

- Signature
- Date
- Text
- Name
- Email
- Number
- Checkbox

## Keyboard Shortcuts

- **Delete/Backspace**: Remove selected field
- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Y**: Redo
- **Ctrl/Cmd + C**: Copy field
- **Ctrl/Cmd + V**: Paste field

## Usage in Production

The main integration point is in `/app/signature/pdf/[taskId]/page.tsx` which handles the signature setup workflow.