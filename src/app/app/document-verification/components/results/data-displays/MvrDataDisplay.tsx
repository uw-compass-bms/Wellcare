'use client';

import { MvrData } from '../../../types';

interface MvrDataDisplayProps {
  data: MvrData;
}

export default function MvrDataDisplay({ data }: MvrDataDisplayProps) {
  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div><strong>Name:</strong> {data.name || 'N/A'}</div>
            <div><strong>Gender:</strong> {data.gender || 'N/A'}</div>
            <div><strong>Date of Birth:</strong> {data.date_of_birth || 'N/A'}</div>
          </div>
          <div className="space-y-2">
            <div><strong>License Number:</strong> {data.licence_number || 'N/A'}</div>
            <div><strong>License Class:</strong> {data.class || 'N/A'}</div>
            <div>
              <strong>Status:</strong> 
              <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                data.status === 'LICENCED' ? 'bg-green-100 text-green-800' :
                data.status === 'EXPIRED' ? 'bg-yellow-100 text-yellow-800' :
                data.status === 'SUSPENDED' ? 'bg-red-100 text-red-800' :
                data.status === 'UNLICENSED' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {data.status || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 驾照状态警告 */}
      {data.status && data.status !== 'LICENCED' && (
        <div className="p-4 rounded-lg border-l-4 border-red-500 bg-red-50">
          <div className="flex items-center">
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">
                License Status Alert
              </h4>
              <p className="text-sm text-red-700 mt-1">
                This license status is <strong>{data.status}</strong>, which is not a valid LICENCED status. Please carefully review and confirm the driver&apos;s driving eligibility.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 地址信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Address</h4>
        <p className="text-sm text-gray-700">{data.address?.replace(/\\n/g, ', ') || 'N/A'}</p>
      </div>

      {/* 驾照信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">License Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Issue Date:</strong> {data.issue_date || 'N/A'}</div>
          <div><strong>Expiry Date:</strong> {data.expiry_date || 'N/A'}</div>
        </div>
      </div>

      {/* 条件限制 - 过滤掉不需要的条件 */}
      {(() => {
        const validConditions = data.conditions?.filter(condition => 
          // 过滤掉不需要的条件
          !condition.description.includes('REQUIRES CORRECTIVE LENSES') &&
          !condition.description.includes('CORRECTIVE LENSES') &&
          !condition.description.includes('SEARCH SUCCESSFUL - NO PUBLIC RECORD')
        ) || [];
        
        return validConditions.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">License Conditions</h4>
            <div className="space-y-2">
              {validConditions.map((condition, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
                  <p className="text-sm font-medium">{condition.description}</p>
                  {condition.date && <p className="text-xs text-gray-500">Date: {condition.date}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 违规记录 - 优化显示 */}
      {data.convictions && data.convictions.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Convictions</h4>
          <div className="space-y-3">
            {data.convictions.map((conviction, index) => (
              <div key={index} className="border-l-4 border-red-500 pl-4 py-3 bg-red-50 rounded-r-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">{conviction.description}</p>
                    {conviction.date && (
                      <p className="text-xs text-red-700 mt-1">
                        <strong>Conviction Date:</strong> {conviction.date}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Conviction
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 没有违规记录时显示 */}
      {(!data.convictions || data.convictions.length === 0) && (
        <div className="border-l-4 border-green-500 pl-4 py-3 bg-green-50 rounded-r-lg">
          <p className="text-sm font-medium text-green-900">No Convictions</p>
          <p className="text-xs text-green-700 mt-1">This driver has no relevant conviction records.</p>
        </div>
      )}
    </div>
  );
} 