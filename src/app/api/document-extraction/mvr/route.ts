import { NextRequest, NextResponse } from 'next/server';
import { callAI, parseAIResponse, handleAPIError } from '@/lib/document-extraction/shared';
import { MVR_PROMPT } from '@/lib/document-extraction/mvr-prompt';

// MVR data type
interface MvrData {
  licence_number: string | null;
  name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  class: string | null;
  status: string | null;
  conditions: Array<{
    date: string | null;
    description: string;
  }> | null;
  convictions: Array<{
    date: string | null;
    description: string;
  }> | null;
  // Multi-file support fields
  file_name?: string;
  file_id?: string;
}

// Multi-file MVR data type
interface MvrMultiData {
  records: Array<MvrData & { file_id: string; file_name: string; }>;
  metadata: {
    total_files: number;
    successful_files: number;
    failed_files: number;
    model_used: string;
    errors?: Array<{ file_id: string; file_name: string; error: string }>;
  };
}

// Single file processing API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { b64data, fileName, fileSize } = body;

    if (!b64data) {
      return NextResponse.json(
        { success: false, error: 'No file data provided' },
        { status: 400 }
      );
    }

    // Call AI with MVR-specific prompt
    const aiResult = await callAI(b64data, MVR_PROMPT, fileName);
    
    if (!aiResult.response || aiResult.response.error) {
      throw new Error(`AI processing failed: ${JSON.stringify(aiResult.response)}`);
    }
    
    if (!aiResult.text) {
      throw new Error('AI returned no result');
    }
    
    const result = parseAIResponse(aiResult.text);
    
    if (!result) {
      throw new Error('Data parsing failed');
    }

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        file_name: fileName,
        file_size: fileSize,
        model_used: "google/gemini-2.5-flash-preview"
      }
    });

  } catch (error) {
    const errorResponse = handleAPIError(error, 'MVR');
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
}

// Multi-file processing API
export async function PUT(request: NextRequest) {
  try {
    const { files } = await request.json();
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'No files provided' 
      }, { status: 400 });
    }

    console.log(`Starting multi-file MVR processing for ${files.length} files`);

    const results: Array<MvrData & { file_id: string; file_name: string; }> = [];
    const errors: Array<{ file_id: string; file_name: string; error: string }> = [];

    // Process each file individually
    for (const file of files) {
      const { b64data, fileName, fileId } = file;
      
      if (!b64data || !fileName || !fileId) {
        errors.push({
          file_id: fileId || 'unknown',
          file_name: fileName || 'unknown',
          error: 'Missing file data, name, or ID'
        });
        continue;
      }

      try {
        console.log(`Processing file: ${fileName} (ID: ${fileId})`);
        
        // Call AI processing
        const aiResult = await callAI(b64data, MVR_PROMPT, fileName);
        
        if (!aiResult.response || aiResult.response.error) {
          throw new Error(`AI processing failed: ${JSON.stringify(aiResult.response)}`);
        }
        
        if (!aiResult.text) {
          throw new Error('AI returned no result');
        }
        
        const extractedData = parseAIResponse<MvrData>(aiResult.text);
        
        if (!extractedData) {
          throw new Error('Data parsing failed');
        }
        
        // Add file metadata
        const recordWithFileInfo = {
          ...extractedData,
          file_name: fileName,
          file_id: fileId
        };
        
        results.push(recordWithFileInfo);
        console.log(`File ${fileName} processed successfully`);
        
        // Add delay to avoid API rate limits
        if (files.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`Failed to process file ${fileName}:`, error);
        errors.push({
          file_id: fileId,
          file_name: fileName,
          error: error instanceof Error ? error.message : 'Processing failed'
        });
      }
    }

    // Build multi-file response
    const multiData: MvrMultiData = {
      records: results,
      metadata: {
        total_files: files.length,
        successful_files: results.length,
        failed_files: errors.length,
        model_used: "google/gemini-2.5-flash-preview",
        ...(errors.length > 0 && { errors })
      }
    };

    return NextResponse.json({
      success: true,
      data: multiData
    });

  } catch (error) {
    const errorResponse = handleAPIError(error, 'Multi-file MVR');
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
} 