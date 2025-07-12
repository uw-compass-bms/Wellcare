import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ 
  title, 
  description, 
  className,
  children 
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{title}</h1>
        {description && (
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">{description}</p>
        )}
      </div>
      {children && (
        <div className="mt-6">
          {children}
        </div>
      )}
    </div>
  );
} 