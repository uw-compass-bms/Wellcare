# UW Compass - MVR Data Extractor

A powerful AI-driven web application that extracts structured data from MVR (Motor Vehicle Record) documents using advanced OCR and vision capabilities.

## 🚀 Quick Start

1. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open application**
   Visit http://localhost:3000

## ✨ Key Features

- 🔄 **Multi-Format Support**: PDF, PNG, JPG, JPEG, WebP files
- 🧠 **AI-Powered OCR**: Google Gemini 2.0 Flash for accurate text recognition
- 📊 **Structured Data**: Extracts all MVR fields in standardized JSON format
- 🎨 **Modern UI**: Clean, responsive interface with data audit capabilities
- ⚡ **Smart Processing**: Automatic file type detection and format optimization
- 🔍 **Data Validation**: Built-in error handling and data verification

## 🏗️ System Architecture

### File Processing Pipeline
```
Upload → File Type Detection → Format Conversion → Base64 Encoding → AI Processing → Structured Output
```

1. **File Upload & Detection**: Supports PDF and image formats
2. **Format Conversion**: PDF → PNG conversion, image optimization with Sharp
3. **Base64 Encoding**: Prepares data for AI vision model
4. **AI Processing**: Google Gemini 2.0 Flash performs OCR and data extraction
5. **Structured Output**: Returns validated JSON with complete MVR data

### Technology Stack
- **Frontend**: Next.js 15, TypeScript, React
- **Backend**: Next.js API Routes, Node.js
- **AI Model**: Google Gemini 2.0 Flash (via OpenRouter)
- **Image Processing**: Sharp, pdf-poppler
- **File Handling**: Native File API, Buffer processing

## 📋 Extracted Data Fields

The system extracts comprehensive MVR information:

### Personal Information
- **licence_number**: Driver's licence number (formatted: 1 letter + 14 digits)
- **name**: Full name in "LASTNAME, FIRSTNAME" format
- **gender**: Gender designation
- **address**: Complete address including postal code
- **date_of_birth**: Birth date (YYYY-MM-DD format)

### Licence Details
- **class**: Licence class (G, G2, etc.)
- **status**: Current licence status
- **issue_date**: Original issue date
- **expiry_date**: Licence expiry date

### Additional Records
- **conditions**: Array of licence conditions and endorsements
- **convictions**: Array of traffic violations and convictions

## 🔄 Usage Workflow

1. **Document Upload**
   - Select MVR document (PDF or image)
   - System auto-detects file type
   - File validation and size check

2. **Processing**
   - PDF → Image conversion (if needed)
   - Image optimization and standardization
   - Base64 encoding for AI transmission

3. **AI Extraction**
   - Google Gemini 2.0 Flash analyzes document
   - OCR recognition and field extraction
   - Structured JSON response generation

4. **Results Display**
   - Formatted data presentation
   - Data audit recommendations
   - Raw JSON export option

## 🛠️ Advanced Features

### File Type Detection
```typescript
// Automatic detection of file formats
export const b64dataIsPdf = (b64data: string) => {
  return b64data.startsWith("JVBERi"); // PDF signature
};

export const b64dataIsImage = (b64data: string) => {
  return (
    b64data.startsWith("/9j/") ||      // JPEG
    b64data.startsWith("iVBORw0KGgo") || // PNG
    b64data.startsWith("UklGR")        // WebP
  );
};
```

### Image Processing
- **Format Standardization**: Converts all images to PNG
- **Size Optimization**: Max 2000x2000px while maintaining aspect ratio
- **Quality Enhancement**: 200 DPI processing for better OCR accuracy

### Error Handling
- Comprehensive error catching and user feedback
- Fallback mechanisms for processing failures
- Development vs production error detail levels

## 📊 API Response Format

```json
{
  "success": true,
  "data": {
    "licence_number": "D12345678901234",
    "name": "DOE, JOHN",
    "gender": "M",
    "address": "123 Main Street\nTORONTO, ON\nL4S 1V2",
    "expiry_date": "2028-12-31",
    "date_of_birth": "1980-01-01",
    "class": "G",
    "status": "LICENCED",
    "issue_date": "2015-10-05",
    "conditions": [
      { "date": "", "description": "CORRECTIVE LENSES" }
    ],
    "convictions": [
      { "date": "2022-06-15", "description": "SPEEDING - 80 KM/H in a 60 KM/H ZONE" }
    ]
  },
  "metadata": {
    "file_name": "mvr_document.pdf",
    "file_type": "application/pdf",
    "file_size": 2048576,
    "pages_processed": 1,
    "detected_type": "pdf",
    "model_used": "google/gemini-2.0-flash-exp"
  }
}
```

## 🔧 Environment Setup

### Prerequisites
- Node.js 18+
- OpenRouter API key with Gemini access
- System dependencies for PDF processing

### Dependencies
```json
{
  "sharp": "Image processing and optimization",
  "pdf-poppler": "PDF to image conversion",
  "next": "React framework with API routes"
}
```

## 📂 Project Structure

```
src/
├── app/
│   ├── api/extract-mvr/
│   │   └── route.ts          # Main API endpoint
│   ├── page.tsx              # Frontend interface
│   ├── layout.tsx            # App layout
│   └── globals.css           # Global styles
├── types/                    # TypeScript definitions
└── utils/                    # Utility functions
```

## 🚨 Current Limitations

- **Single Page Processing**: Currently processes first page of multi-page PDFs
- **File Size Limits**: Recommended max 10MB for optimal performance
- **Network Dependency**: Requires stable internet for AI processing
- **Rate Limits**: Subject to OpenRouter API rate limiting

## 🛣️ Roadmap

### Phase 2: Enhanced Processing
- [ ] Multi-page PDF support
- [ ] Batch file processing
- [ ] Custom field extraction rules
- [ ] Confidence scoring for extracted data

### Phase 3: Integration Features
- [ ] Database storage and history
- [ ] RESTful API for external integration
- [ ] Webhook support for automated workflows
- [ ] Export to multiple formats (CSV, Excel, XML)

### Phase 4: Advanced Analytics
- [ ] Data comparison and change detection
- [ ] Automated validation rules
- [ ] Reporting and analytics dashboard
- [ ] Audit trail and compliance features

## 🔒 Security & Privacy

- No permanent file storage
- Temporary files auto-cleaned
- API key encryption
- HTTPS-only communication
- Data validation and sanitization

## 📄 License & Support

- Built for UW Compass project
- Educational and commercial use permitted
- Community support via GitHub issues
- Professional support available on request

---

**Ready to extract structured data from your MVR documents? Upload a file and let AI do the work!** 🚀
