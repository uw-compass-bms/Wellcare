"use client";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Users, PenTool } from 'lucide-react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Navigation menu configuration
  const navigation = [
    {
      name: 'Document Extraction',
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
      name: 'Electronic Signature',
      href: '/app/signature',
      icon: PenTool,
      current: pathname.startsWith('/app/signature')
    }
  ];



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main application navigation bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side brand and navigation */}
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/app/document-verification" className="text-2xl font-bold text-blue-600">
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

            {/* Right side user menu */}
            <div className="flex items-center">
              <UserButton />
            </div>
          </div>
        </div>

        {/* Mobile navigation menu */}
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



      {/* Main content area */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
} 