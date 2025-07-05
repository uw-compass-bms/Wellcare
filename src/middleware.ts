import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 定义需要认证保护的路由
const isProtectedRoute = createRouteMatcher([
  '/app(.*)', // 保护所有 /app/* 路由
]);

export default clerkMiddleware(async (auth, req) => {
  try {
    // 如果是受保护的路由，要求用户登录
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  } catch (error) {
    console.error('Middleware error:', error);
    // 在生产环境中，我们可以重定向到登录页面而不是抛出错误
    if (process.env.NODE_ENV === 'production') {
      return Response.redirect(new URL('/sign-in', req.url));
    }
    throw error;
  }
});

export const config = {
  matcher: [
    // 跳过 Next.js 内部路径和所有静态文件，除非在搜索参数中找到它们
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // 始终为API路径运行
    '/(api|trpc)(.*)',
  ],
}; 