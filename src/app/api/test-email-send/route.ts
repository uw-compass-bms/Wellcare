import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId') || 'ee644464-e367-401b-8c94-2f437915ada4';
    
    // Call the email send API directly
    const response = await fetch(`${request.nextUrl.origin}/api/signature/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the authorization header
        'Authorization': request.headers.get('authorization') || '',
        // Forward cookies for auth
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        taskId: taskId,
        testMode: false
      })
    });
    
    const data = await response.text();
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      parsedData = data;
    }
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      data: parsedData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}