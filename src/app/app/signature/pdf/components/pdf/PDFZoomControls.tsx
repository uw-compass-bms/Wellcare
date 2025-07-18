'use client';

import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface PDFZoomControlsProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  minScale?: number;
  maxScale?: number;
  className?: string;
}

const PDFZoomControls: React.FC<PDFZoomControlsProps> = ({
  scale,
  onScaleChange,
  minScale = 0.5,
  maxScale = 2.0,
  className = ''
}) => {
  const scaleStep = 0.1;
  
  const handleZoomIn = () => {
    const newScale = Math.min(maxScale, scale + scaleStep);
    onScaleChange(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(minScale, scale - scaleStep);
    onScaleChange(newScale);
  };

  const handleReset = () => {
    onScaleChange(1.0);
  };

  const handlePresetScale = (presetScale: number) => {
    onScaleChange(presetScale);
  };

  const presetScales = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const displayPercentage = Math.round(scale * 100);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* 缩小按钮 */}
      <button
        onClick={handleZoomOut}
        disabled={scale <= minScale}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Zoom out"
      >
        <ZoomOut size={16} />
      </button>

      {/* 缩放百分比下拉菜单 */}
      <div className="relative">
        <select
          value={scale}
          onChange={(e) => onScaleChange(Number(e.target.value))}
          className="appearance-none bg-white border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
        >
          {presetScales.map((presetScale) => (
            <option key={presetScale} value={presetScale}>
              {Math.round(presetScale * 100)}%
            </option>
          ))}
        </select>
      </div>

      {/* 放大按钮 */}
      <button
        onClick={handleZoomIn}
        disabled={scale >= maxScale}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Zoom in"
      >
        <ZoomIn size={16} />
      </button>

      {/* 重置按钮 */}
      <button
        onClick={handleReset}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Reset zoom (100%)"
      >
        <RotateCcw size={16} />
      </button>

      {/* 当前缩放显示 */}
      <div className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded min-w-[60px] text-center">
        {displayPercentage}%
      </div>

      {/* 快捷缩放按钮 */}
      <div className="flex items-center space-x-1 border-l pl-2">
        {[0.75, 1.0, 1.25].map((presetScale) => (
          <button
            key={presetScale}
            onClick={() => handlePresetScale(presetScale)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              Math.abs(scale - presetScale) < 0.01
                ? 'bg-blue-100 text-blue-800'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {Math.round(presetScale * 100)}%
          </button>
        ))}
      </div>
    </div>
  );
};

export default PDFZoomControls;