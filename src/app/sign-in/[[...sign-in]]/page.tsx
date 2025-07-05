import { SignIn } from '@clerk/nextjs';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 页面头部区域 */}
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
            UW Compass
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up now
            </Link>
          </p>
        </div>

        {/* Clerk登录组件 */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <SignIn 
              appearance={{
                elements: {
                  formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm',
                  card: 'shadow-none',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                }
              }}
              redirectUrl="/app/dashboard"
            />
          </CardContent>
        </Card>

        {/* 页脚支持链接 */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Having trouble signing in?{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
} 