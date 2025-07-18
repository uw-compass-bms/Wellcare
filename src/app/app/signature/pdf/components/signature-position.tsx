'use client';

import React from 'react';
import { SignaturePositionData, RecipientInfo } from '@/lib/types/signature';
import { getPlaceholderText } from '@/lib/utils/coordinates-enhanced';

interface SignaturePositionProps {
  position: SignaturePositionData;
  isSelected: boolean;
  onClick: () => void;
  onDelete: (key: string, event: React.MouseEvent) => void;
  recipients?: RecipientInfo[];
}

/**
 * 签名位置组件 - 使用CSS百分比定位
 */
export const SignaturePosition: React.FC<SignaturePositionProps> = ({
  position,
  isSelected,
  onClick,
  onDelete,
  recipients = []
}) => {
  // 获取组件类型的显示标签
  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      signature: '签',
      date: '日',
      text: '文',
      initials: '初',
      name: '名',
      email: '邮',
      checkbox: '☑',
      company: '司',
      'job title': '职',
      stamp: '章'
    };
    return labels[type] || '控';
  };

  return (
    <div
      className={`absolute border-2 bg-opacity-70 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-100 shadow-lg ring-2 ring-blue-300'
          : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:shadow-md hover:bg-blue-100'
      }`}
      style={{
        // 使用百分比定位
        left: `${position.xPosition}%`,
        top: `${position.yPosition}%`,
        width: `${position.width}%`,
        height: `${position.height}%`,
        zIndex: position.zIndex || 1,
        // 确保最小尺寸
        minWidth: '60px',
        minHeight: '30px',
        // 确保可以接收点击事件
        pointerEvents: 'auto'
      }}
      onClick={onClick}
    >
      {/* 内容显示 */}
      <div className="flex items-center justify-center h-full text-xs text-blue-600 font-medium px-1 truncate">
        {position.options?.placeholder || getPlaceholderText(position.type)}
      </div>
      
      {/* 选中状态的操作按钮 */}
      {isSelected && (
        <>
          {/* 删除按钮 */}
          <button
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center transition-colors shadow-md"
            onClick={(e) => onDelete(position.key, e)}
            title="删除签名位置"
          >
            ×
          </button>

          {/* 调整大小手柄 */}
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-se-resize" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full cursor-ne-resize" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-sw-resize" />
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full cursor-nw-resize" />
        </>
      )}

      {/* 位置类型指示器 */}
      <div className="absolute -top-1 -left-1 text-xs bg-blue-500 text-white px-1 rounded text-[10px] shadow-sm">
        {getTypeLabel(position.type)}
      </div>

      {/* 接收者信息（如果有多个接收者） */}
      {position.recipientId && recipients.length > 1 && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-[10px] bg-gray-600 text-white px-1 rounded shadow-sm whitespace-nowrap">
          {recipients.find(r => r.id === position.recipientId)?.name || position.recipientId.slice(0, 8)}
        </div>
      )}
    </div>
  );
};

export default SignaturePosition;