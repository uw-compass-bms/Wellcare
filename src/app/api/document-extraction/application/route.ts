import { NextRequest, NextResponse } from 'next/server';
import { callAI, parseAIResponse, handleAPIError } from '@/lib/document-extraction/shared';
import { APPLICATION_PROMPT } from '@/lib/document-extraction/application-prompt';

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

    // Call AI with application-specific prompt
    const aiResult = await callAI(b64data, APPLICATION_PROMPT, fileName);
    
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
    const errorResponse = handleAPIError(error, 'Application');
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
} 