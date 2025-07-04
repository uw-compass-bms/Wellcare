'use client';

import React from 'react';
import { ApplicationData } from '../../../types';

interface ApplicationDataDisplayProps {
  data: ApplicationData;
}

export default function ApplicationDataDisplay({ data }: ApplicationDataDisplayProps) {
  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Applicant Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div><strong>Name:</strong> {data.name || 'N/A'}</div>
            <div><strong>License Number:</strong> {data.licence_number || 'N/A'}</div>
            <div><strong>Date of Birth:</strong> {data.date_of_birth || 'N/A'}</div>
          </div>
          <div className="space-y-2">
            <div><strong>Phone:</strong> {data.phone || 'N/A'}</div>
            <div><strong>Lessor Info:</strong> {data.lessor_info || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* 地址信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Address Information</h4>
        <p className="text-sm text-gray-700">{data.address?.replace(/\\n/g, ', ') || 'N/A'}</p>
      </div>

      {/* 保单信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Policy Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Effective Date:</strong> {data.effective_date || 'N/A'}</div>
          <div><strong>Expiry Date:</strong> {data.expiry_date || 'N/A'}</div>
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
            <div><strong>Ownership Type:</strong> {data.vehicle_ownership === 'lease' ? 'Lease' : data.vehicle_ownership === 'owned' ? 'Owned' : 'N/A'}</div>
            <div><strong>Lienholder Info:</strong> {data.lienholder_info || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* 使用信息 */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Usage Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Annual Driving Distance:</strong> {data.estimated_annual_driving_distance || 'N/A'}</div>
          <div><strong>Commute Distance:</strong> {data.commute_distance || 'N/A'}</div>
        </div>
        {data.automobile_use_details && (
          <div className="mt-2"><strong>Usage Details:</strong> {data.automobile_use_details}</div>
        )}
      </div>

      {/* 驾驶员信息 */}
      {data.drivers && data.drivers.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Driver Information</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2 px-3 border-b">Name</th>
                  <th className="text-left py-2 px-3 border-b">License Number</th>
                  <th className="text-left py-2 px-3 border-b">Date of Birth</th>
                  <th className="text-left py-2 px-3 border-b">Gender</th>
                  <th className="text-left py-2 px-3 border-b">Marital Status</th>
                  <th className="text-left py-2 px-3 border-b">First Licensed Date</th>
                </tr>
              </thead>
              <tbody>
                {data.drivers.map((driver, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 px-3">{driver.name}</td>
                    <td className="py-2 px-3">{driver.licence_number}</td>
                    <td className="py-2 px-3">{driver.date_of_birth}</td>
                    <td className="py-2 px-3">{driver.gender || 'N/A'}</td>
                    <td className="py-2 px-3">{driver.marital_status || 'N/A'}</td>
                    <td className="py-2 px-3">{driver.first_licensed_date || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 保险保障信息 */}
      {data.insurance_coverages && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Insurance Coverage Information</h4>
          <div className="space-y-4">
            <div>
              <div><strong>Liability:</strong> {data.insurance_coverages.liability_amount || 'N/A'}</div>
            </div>
            
            {data.insurance_coverages.loss_or_damage && (
              <div>
                <h5 className="font-medium text-gray-800 mb-2">Loss or Damage Coverage</h5>
                {(() => {
                  const { comprehensive, collision, all_perils } = data.insurance_coverages.loss_or_damage;
                  
                  // 检查All Perils是否有效（covered=true）
                  const hasAllPerils = all_perils?.covered;
                  
                  // 检查Comprehensive和Collision是否都有效
                  const hasComprehensive = comprehensive?.covered;
                  const hasCollision = collision?.covered;
                  const hasSeparateCoverage = hasComprehensive && hasCollision;
                  
                  if (hasAllPerils) {
                    // 显示All Perils（全险）
                    return (
                      <div className="border rounded-lg p-4 bg-blue-50">
                        <h6 className="font-medium text-blue-900 mb-3">All Perils (Full Coverage)</h6>
                        <div className="text-sm text-blue-800">
                          <div className="mb-2"><strong>Coverage Type:</strong> Comprehensive + Collision Combined</div>
                          <div className="mb-2"><strong>Deductible:</strong> {all_perils.deductible || 'N/A'}</div>
                          {'premium' in all_perils && (
                            <div><strong>Premium:</strong> {all_perils.premium || 'N/A'}</div>
                          )}
                        </div>
                      </div>
                    );
                  } else if (hasSeparateCoverage) {
                    // 显示分开的Comprehensive + Collision
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border rounded-lg p-3 bg-green-50">
                          <h6 className="font-medium text-green-900 mb-2">Comprehensive</h6>
                          <div className="space-y-1 text-sm text-green-800">
                            <div><strong>Covered:</strong> Yes</div>
                            <div><strong>Deductible:</strong> {comprehensive.deductible || 'N/A'}</div>
                          </div>
                        </div>
                        <div className="border rounded-lg p-3 bg-green-50">
                          <h6 className="font-medium text-green-900 mb-2">Collision</h6>
                          <div className="space-y-1 text-sm text-green-800">
                            <div><strong>Covered:</strong> Yes</div>
                            <div><strong>Deductible:</strong> {collision.deductible || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // 没有有效的损失或损害保险
                    return (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="text-sm text-gray-600">No Loss or Damage Coverage</div>
                      </div>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 附加条款 */}
      {data.policy_change_forms && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Policy Change Forms</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>#20 Loss of Use:</strong> {data.policy_change_forms.loss_of_use !== null ? (data.policy_change_forms.loss_of_use ? 'Yes' : 'No') : 'N/A'}</div>
            <div><strong>#27 Liab to Unowned Veh:</strong> {data.policy_change_forms.liab_to_unowned_veh !== null ? (data.policy_change_forms.liab_to_unowned_veh ? 'Yes' : 'No') : 'N/A'}</div>
            <div><strong>#43a Limited Waiver:</strong> {data.policy_change_forms.limited_waiver !== null ? (data.policy_change_forms.limited_waiver ? 'Yes' : 'No') : 'N/A'}</div>
            <div><strong>#5a Rent or Lease:</strong> {data.policy_change_forms.rent_or_lease !== null ? (data.policy_change_forms.rent_or_lease ? 'Yes' : 'No') : 'N/A'}</div>
            <div><strong>Accident Waiver:</strong> {data.policy_change_forms.accident_waiver !== null ? (data.policy_change_forms.accident_waiver ? 'Yes' : 'No') : 'N/A'}</div>
            <div><strong>Minor Conviction Protection:</strong> {data.policy_change_forms.minor_conviction_protection !== null ? (data.policy_change_forms.minor_conviction_protection ? 'Yes' : 'No') : 'N/A'}</div>
          </div>
        </div>
      )}

      {/* 支付信息 */}
      {data.payment_info && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Payment Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><strong>Annual Premium:</strong> {data.payment_info.annual_premium || 'N/A'}</div>
            <div><strong>Monthly Payment:</strong> {data.payment_info.monthly_payment || 'N/A'}</div>
            <div><strong>Payment Type:</strong> {data.payment_info.payment_type === 'annual' ? 'Annual' : data.payment_info.payment_type === 'monthly' ? 'Monthly' : 'N/A'}</div>
          </div>
        </div>
      )}

      {/* 签名信息 */}
      {data.signatures && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Signature Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div><strong>Applicant Signed:</strong> {data.signatures.applicant_signed ? 'Yes' : 'No'}</div>
              <div><strong>Applicant Signature Date:</strong> {data.signatures.applicant_signature_date || 'N/A'}</div>
            </div>
            <div className="space-y-2">
              <div><strong>Broker Signed:</strong> {data.signatures.broker_signed ? 'Yes' : 'No'}</div>
              <div><strong>Broker Signature Date:</strong> {data.signatures.broker_signature_date || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      {/* 备注信息 */}
      {data.remarks && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Remarks</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm whitespace-pre-line">{data.remarks.replace(/\\n/g, '\n')}</p>
          </div>
        </div>
      )}
    </div>
  );
} 