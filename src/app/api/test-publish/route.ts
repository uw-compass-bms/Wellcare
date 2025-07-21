import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    // Test authentication
    const authResult = await validateAuth();
    
    return NextResponse.json({
      success: true,
      auth: {
        success: authResult.success,
        userId: authResult.userId,
        error: authResult.error
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}