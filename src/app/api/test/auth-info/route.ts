import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

/**
 * GET /api/test/auth-info
 * 显示当前用户的认证信息，用于测试和调试
 * 这个端点需要用户在浏览器中登录后才能访问
 */
export async function GET() {
  try {
    // 获取认证信息
    const authData = await auth()
    const user = await currentUser()

    const response = {
      timestamp: new Date().toISOString(),
      auth: {
        userId: authData.userId,
        sessionId: authData.sessionId,
        orgId: authData.orgId,
        orgRole: authData.orgRole,
        orgSlug: authData.orgSlug
      },
      user: user ? {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddresses: user.emailAddresses.map(email => ({
          emailAddress: email.emailAddress,
          verified: email.verification?.status === 'verified'
        })),
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt
      } : null,
      session: {
        hasValidSession: !!authData.userId,
        isSignedIn: !!user
      },
      instructions: {
        message: "To test authenticated requests, you need to:",
        steps: [
          "1. Open your browser and go to http://localhost:3000/sign-in",
          "2. Sign in with your account", 
          "3. After signing in, visit http://localhost:3000/api/test/auth-info",
          "4. Copy the userId from the response",
          "5. Use that userId for testing authenticated API endpoints"
        ],
        note: "For API testing with curl, you'll need to copy the session cookie from browser DevTools"
      }
    }

    return NextResponse.json(response, { 
      status: authData.userId ? 200 : 401 
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get auth info',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      suggestion: "Make sure you're signed in by visiting /sign-in first"
    }, { status: 500 })
  }
} 