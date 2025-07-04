'use client';

import { AutoPlusData } from '../../../types';

interface AutoPlusDataDisplayProps {
  data: AutoPlusData;
}

export default function AutoPlusDataDisplay({ data }: AutoPlusDataDisplayProps) {
  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div><strong>Name:</strong> {data.name || 'N/A'}</div>
            <div><strong>License Number:</strong> {data.licence_number || 'N/A'}</div>
          </div>
          <div className="space-y-2">
            <div><strong>Date of Birth:</strong> {data.date_of_birth || 'N/A'}</div>
            <div><strong>First Insurance Date:</strong> {data.first_insurance_date || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* 地址信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Address</h4>
        <p className="text-sm text-gray-700">{data.address?.replace(/\\n/g, ', ') || 'N/A'}</p>
      </div>

      {/* 保单历史 */}
      {data.policies && data.policies.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Policy History</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 border-b">Policy Period</th>
                  <th className="text-left py-2 px-3 border-b">Company</th>
                  <th className="text-left py-2 px-3 border-b">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.policies.map((policy, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-3">{policy.policy_period}</td>
                    <td className="py-2 px-3">{policy.company}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        policy.status.includes('Cancelled') 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {policy.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  <th className="text-left py-2 px-3 border-b">Claim Number</th>
                  <th className="text-left py-2 px-3 border-b">Date of Loss</th>
                  <th className="text-left py-2 px-3 border-b">At Fault</th>
                  <th className="text-left py-2 px-3 border-b">Amount</th>
                  <th className="text-left py-2 px-3 border-b">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {data.claims.map((claim, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-3">{claim.claim_number}</td>
                    <td className="py-2 px-3">{claim.date_of_loss}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        claim.at_fault 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {claim.at_fault ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="py-2 px-3">{claim.total_claim_amount}</td>
                    <td className="py-2 px-3">{claim.coverage_types || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 