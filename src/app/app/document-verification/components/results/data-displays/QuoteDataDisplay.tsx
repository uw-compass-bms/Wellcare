'use client';

import { QuoteData } from '../../../types';

interface QuoteDataDisplayProps {
  data: QuoteData;
}

export default function QuoteDataDisplay({ data }: QuoteDataDisplayProps) {
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
            <div><strong>License Class:</strong> {data.licence_class || 'N/A'}</div>
          </div>
          <div className="space-y-2">
            <div><strong>License Number:</strong> {data.licence_number || 'N/A'}</div>
            <div><strong>Date Insured:</strong> {data.date_insured || 'N/A'}</div>
            <div><strong>Date with Company:</strong> {data.date_with_company || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* 驾照日期信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">License Dates</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><strong>G1 Date:</strong> {data.date_g1 || 'N/A'}</div>
          <div><strong>G2 Date:</strong> {data.date_g2 || 'N/A'}</div>
          <div><strong>G Date:</strong> {data.date_g || 'N/A'}</div>
        </div>
      </div>

      {/* 车辆信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Vehicle Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div><strong>Year:</strong> {data.vehicle_year || 'N/A'}</div>
            <div><strong>Make:</strong> {data.vehicle_make || 'N/A'}</div>
            <div><strong>Model:</strong> {data.vehicle_model || 'N/A'}</div>
          </div>
          <div className="space-y-2">
            <div><strong>VIN:</strong> {data.vin || 'N/A'}</div>
            <div><strong>Garaging Location:</strong> {data.garaging_location || 'N/A'}</div>
            <div><strong>Leased:</strong> {data.leased !== null ? (data.leased ? 'Yes' : 'No') : 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* 使用信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Usage Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Annual Mileage:</strong> {data.annual_mileage || 'N/A'}</div>
          <div><strong>Commute Distance:</strong> {data.commute_distance || 'N/A'}</div>
        </div>
      </div>

      {/* 客户联系信息 */}
      {data.customer_contact_info && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Customer Contact Information</h4>
          <div className="space-y-2">
            <div><strong>Address:</strong> {data.customer_contact_info.full_address || 'N/A'}</div>
            <div><strong>Email:</strong> {data.customer_contact_info.email || 'N/A'}</div>
            <div><strong>Phone:</strong> {data.customer_contact_info.phone || 'N/A'}</div>
          </div>
        </div>
      )}

      {/* 理赔历史 */}
      {data.claims && data.claims.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Claims History</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 border-b">Description</th>
                  <th className="text-left py-2 px-3 border-b">Date</th>
                  <th className="text-left py-2 px-3 border-b">At Fault</th>
                  <th className="text-left py-2 px-3 border-b">Vehicle</th>
                  <th className="text-left py-2 px-3 border-b">Amounts</th>
                </tr>
              </thead>
              <tbody>
                {data.claims.map((claim, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-3">{claim.description}</td>
                    <td className="py-2 px-3">{claim.date}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        claim.at_fault 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {claim.at_fault ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs">{claim.vehicle_involved}</td>
                    <td className="py-2 px-3 text-xs">
                      <div>TP/PD: {claim.tp_pd || 'N/A'}</div>
                      <div>AB: {claim.ab || 'N/A'}</div>
                      <div>Coll: {claim.coll || 'N/A'}</div>
                      <div>Other: {claim.other_pd || 'N/A'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 违规记录 */}
      {data.convictions && data.convictions.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Convictions</h4>
          <div className="space-y-2">
            {data.convictions.map((conviction, index) => (
              <div key={index} className="border-l-4 border-red-500 pl-4 py-2 bg-red-50">
                <p className="text-sm font-medium">{conviction.description}</p>
                <div className="text-xs text-gray-500 mt-1">
                  <span>Date: {conviction.date}</span>
                  <span className="ml-4">Severity: {conviction.severity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 保险中断记录 */}
      {data.lapses && data.lapses.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Insurance Lapses</h4>
          <div className="space-y-2">
            {data.lapses.map((lapse, index) => (
              <div key={index} className="border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-50">
                <p className="text-sm font-medium">{lapse.description}</p>
                <div className="text-xs text-gray-500 mt-1">
                  <span>From: {lapse.start_date}</span>
                  <span className="ml-4">To: {lapse.end_date}</span>
                  <span className="ml-4">Duration: {lapse.duration_months} months</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 