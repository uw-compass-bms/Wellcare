import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// 预定义的颜色主题
export const colorThemes = {
  blue: {
    icon: "text-blue-600",
    background: "bg-blue-50",
    border: "border-blue-200"
  },
  green: {
    icon: "text-green-600", 
    background: "bg-green-50",
    border: "border-green-200"
  },
  purple: {
    icon: "text-purple-600",
    background: "bg-purple-50", 
    border: "border-purple-200"
  },
  orange: {
    icon: "text-orange-600",
    background: "bg-orange-50",
    border: "border-orange-200"
  },
  gray: {
    icon: "text-gray-600",
    background: "bg-gray-50",
    border: "border-gray-200"
  }
} as const;

export type ColorTheme = keyof typeof colorThemes;

interface IconCardProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  color?: ColorTheme;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function IconCard({ 
  icon: Icon, 
  title, 
  description, 
  color = 'blue', 
  size = 'md',
  className,
  onClick 
}: IconCardProps) {
  const theme = colorThemes[color];
  
  const sizeClasses = {
    sm: {
      container: "w-8 h-8",
      icon: "w-4 h-4",
      title: "text-sm font-medium",
      description: "text-xs"
    },
    md: {
      container: "w-10 h-10", 
      icon: "w-5 h-5",
      title: "text-base font-medium",
      description: "text-sm"
    },
    lg: {
      container: "w-12 h-12",
      icon: "w-6 h-6", 
      title: "text-lg font-semibold",
      description: "text-sm"
    }
  };

  const sizes = sizeClasses[size];

  return (
    <div 
      className={cn(
        "flex items-center space-x-3",
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={onClick}
    >
      <div className={cn(
        "rounded-lg flex items-center justify-center flex-shrink-0",
        theme.background,
        sizes.container
      )}>
        <Icon className={cn(theme.icon, sizes.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={cn("text-gray-900", sizes.title)}>{title}</h3>
        {description && (
          <p className={cn("text-gray-600 mt-1", sizes.description)}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
} 