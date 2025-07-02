"use client";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Users, Settings } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // 导航菜单配置
  const navigation = [
    {
      name: 'Dashboard',
      href: '/app/dashboard',
      icon: BarChart3,
      current: pathname === '/app/dashboard'
    },
    {
      name: 'Document Verification', 
      href: '/app/document-verification',
      icon: FileText,
      current: pathname === '/app/document-verification'
    },
    {
      name: 'Client Management',
      href: '/app/client-management', 
      icon: Users,
      current: pathname === '/app/client-management'
    },
    {
      name: 'Tools',
      href: '/app/tools',
      icon: Settings, 
      current: pathname === '/app/tools'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 主应用导航栏 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* 左侧品牌和导航 */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-2xl font-bold text-blue-600">
                  UW Compass
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`${
                        item.current
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      <IconComponent className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 右侧用户菜单 */}
            <div className="flex items-center">
              <UserButton />
            </div>
          </div>
        </div>

        {/* 移动端导航菜单 */}
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    item.current
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium flex items-center`}
                >
                  <IconComponent className="w-4 h-4 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
} 