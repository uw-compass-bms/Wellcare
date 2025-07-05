'use client';

import { ApplicationData } from '../../../types';

interface ApplicationDataDisplayProps {
  data: ApplicationData;
}

export default function ApplicationDataDisplay({ data }: ApplicationDataDisplayProps) {
  return (
    <div className="space-y-6">
      {/* 申请人基本信息 */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Applicant Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div><strong>Name:</strong> {data.name || 'N/A'}</div>
            <div><strong>License Number:</strong> {data.licence_number || 'N/A'}</div>
            <div><strong>Date of Birth:</strong> {data.date_of_birth || 'N/A'}</div>
            <div><strong>Phone:</strong> {data.phone || 'N/A'}</div>
          </div>
          <div className="space-y-2">
            <div><strong>Address:</strong></div>
            <p className="text-sm text-gray-700 ml-4">
              {data.address?.replace(/\\n/g, ', ') || 'N/A'}
            </p>
            <div><strong>Lessor Info:</strong> {data.lessor_info || 'N/A'}</div>
          </div>
        </div>
        
        {/* 保单信息 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3">Policy Period</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>Effective Date:</strong> {data.effective_date || 'N/A'}</div>
            <div><strong>Expiry Date:</strong> {data.expiry_date || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* 多车辆信息展示 */}
      {data.vehicles && data.vehicles.length > 0 ? (
        <div className="space-y-8">
          {/* 车辆概览 */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Vehicle Overview ({data.vehicles.length} {data.vehicles.length === 1 ? 'Vehicle' : 'Vehicles'})
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.vehicles.map((vehicle, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {vehicle.vehicle_id || `Vehicle ${index + 1}`}
                  </h4>
                  {vehicle.vehicle_year && vehicle.vehicle_make && vehicle.vehicle_model && (
                    <p className="text-sm text-gray-600 mb-3">
                      {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                    </p>
                  )}
                  
                  {/* 车辆基本信息 */}
                  <div className="space-y-2 text-sm mb-4">
                    <div><strong>VIN:</strong> {vehicle.vin || 'N/A'}</div>
                    <div><strong>Ownership:</strong> {vehicle.vehicle_ownership === 'lease' ? 'Lease' : vehicle.vehicle_ownership === 'owned' ? 'Owned' : 'N/A'}</div>
                    {vehicle.annual_mileage && (
                      <div><strong>Annual Mileage:</strong> {vehicle.annual_mileage}</div>
                    )}
                    {vehicle.commute_distance && (
                      <div><strong>Commute Distance:</strong> {vehicle.commute_distance}</div>
                    )}
                    {vehicle.lienholder_info && (
                      <div><strong>Lienholder:</strong> {vehicle.lienholder_info}</div>
                    )}
                  </div>
                  
                  {/* 保险保障概览 */}
                  {vehicle.coverages && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <h5 className="font-medium text-gray-800 mb-2">Coverage Summary</h5>
                      <div className="space-y-1 text-xs">
                        {vehicle.coverages.liability?.bodily_injury && (
                          <div><strong>Bodily Injury:</strong> ${vehicle.coverages.liability.bodily_injury.amount || 'N/A'} (${vehicle.coverages.liability.bodily_injury.premium || 'N/A'})</div>
                        )}
                        {vehicle.coverages.loss_or_damage?.all_perils && (
                          <div><strong>All Perils:</strong> ${vehicle.coverages.loss_or_damage.all_perils.deductible || '0'} deductible (${vehicle.coverages.loss_or_damage.all_perils.premium || 'N/A'})</div>
                        )}
                        {vehicle.coverages.loss_or_damage?.collision && (
                          <div><strong>Collision:</strong> ${vehicle.coverages.loss_or_damage.collision.deductible || '0'} deductible (${vehicle.coverages.loss_or_damage.collision.premium || 'N/A'})</div>
                        )}
                        {vehicle.coverages.loss_or_damage?.comprehensive && (
                          <div><strong>Comprehensive:</strong> ${vehicle.coverages.loss_or_damage.comprehensive.deductible || '0'} deductible (${vehicle.coverages.loss_or_damage.comprehensive.premium || 'N/A'})</div>
                        )}
                        {vehicle.coverages.total_premium && (
                          <div className="mt-2 pt-2 border-t border-gray-400">
                            <strong>Vehicle Total: ${vehicle.coverages.total_premium}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 详细车辆信息 */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Vehicle Information</h3>
            
            <div className="space-y-8">
              {data.vehicles.map((vehicle, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    {vehicle.vehicle_id || `Vehicle ${index + 1}`}
                    {vehicle.vehicle_year && vehicle.vehicle_make && vehicle.vehicle_model && (
                      <span className="text-base font-normal text-gray-600 ml-2">
                        ({vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model})
                      </span>
                    )}
                  </h4>
                  
                  {/* 车辆详细信息 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Vehicle Details</h5>
                      <div className="space-y-1 text-sm">
                        <div><strong>VIN:</strong> {vehicle.vin || 'N/A'}</div>
                        <div><strong>Ownership:</strong> {vehicle.vehicle_ownership === 'lease' ? 'Lease' : vehicle.vehicle_ownership === 'owned' ? 'Owned' : 'N/A'}</div>
                        <div><strong>Annual Mileage:</strong> {vehicle.annual_mileage || 'N/A'}</div>
                        <div><strong>Commute Distance:</strong> {vehicle.commute_distance || 'N/A'}</div>
                        {vehicle.automobile_use_details && (
                          <div><strong>Use Details:</strong> {vehicle.automobile_use_details}</div>
                        )}
                      </div>
                    </div>
                    
                    {vehicle.lienholder_info && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Lienholder Information</h5>
                        <div className="text-sm text-gray-600">
                          {vehicle.lienholder_info}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 详细保险保障信息 */}
                  {vehicle.coverages && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-3">Insurance Coverages</h5>
                      <div className="space-y-4">
                        {/* 基础责任险 */}
                        {vehicle.coverages.liability && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h6 className="text-xs font-medium text-gray-600 mb-1">Liability Coverage</h6>
                              <div className="space-y-1 text-sm">
                                {vehicle.coverages.liability.bodily_injury && (
                                  <div><strong>Bodily Injury:</strong> ${vehicle.coverages.liability.bodily_injury.amount || 'N/A'} (${vehicle.coverages.liability.bodily_injury.premium || 'N/A'})</div>
                                )}
                                {vehicle.coverages.liability.property_damage && (
                                  <div><strong>Property Damage:</strong> ${vehicle.coverages.liability.property_damage.amount || 'N/A'} (${vehicle.coverages.liability.property_damage.premium || 'N/A'})</div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h6 className="text-xs font-medium text-gray-600 mb-1">Additional Coverage</h6>
                              <div className="space-y-1 text-sm">
                                {vehicle.coverages.accident_benefits?.standard && (
                                  <div><strong>Accident Benefits:</strong> ${vehicle.coverages.accident_benefits.standard.premium || 'N/A'}</div>
                                )}
                                {vehicle.coverages.uninsured_automobile && (
                                  <div><strong>Uninsured Auto:</strong> ${vehicle.coverages.uninsured_automobile.premium || 'N/A'}</div>
                                )}
                                {vehicle.coverages.direct_compensation && (
                                  <div><strong>Direct Compensation:</strong> ${vehicle.coverages.direct_compensation.deductible || '0'} deductible (${vehicle.coverages.direct_compensation.premium || 'N/A'})</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* 车辆损失保障 */}
                        {vehicle.coverages.loss_or_damage && (
                          <div>
                            <h6 className="text-xs font-medium text-gray-600 mb-1">Vehicle Loss Coverage</h6>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                              {vehicle.coverages.loss_or_damage.all_perils && (
                                <div><strong>All Perils:</strong> ${vehicle.coverages.loss_or_damage.all_perils.deductible || '0'} deductible (${vehicle.coverages.loss_or_damage.all_perils.premium || 'N/A'})</div>
                              )}
                              {vehicle.coverages.loss_or_damage.collision && (
                                <div><strong>Collision:</strong> ${vehicle.coverages.loss_or_damage.collision.deductible || '0'} deductible (${vehicle.coverages.loss_or_damage.collision.premium || 'N/A'})</div>
                              )}
                              {vehicle.coverages.loss_or_damage.comprehensive && (
                                <div><strong>Comprehensive:</strong> ${vehicle.coverages.loss_or_damage.comprehensive.deductible || '0'} deductible (${vehicle.coverages.loss_or_damage.comprehensive.premium || 'N/A'})</div>
                              )}
                              {vehicle.coverages.loss_or_damage.specified_perils && (
                                <div><strong>Specified Perils:</strong> ${vehicle.coverages.loss_or_damage.specified_perils.deductible || '0'} deductible (${vehicle.coverages.loss_or_damage.specified_perils.premium || 'N/A'})</div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* 车辆保费合计 */}
                        {vehicle.coverages.total_premium && (
                          <div className="pt-3 border-t border-gray-300">
                            <div className="text-sm font-medium">
                              <strong>Vehicle Total Premium: ${vehicle.coverages.total_premium}</strong>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* 如果没有新格式数据，显示旧格式 */
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information (Legacy Format)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div><strong>Year:</strong> {data.vehicle_year || 'N/A'}</div>
              <div><strong>Make:</strong> {data.vehicle_make || 'N/A'}</div>
              <div><strong>Model:</strong> {data.vehicle_model || 'N/A'}</div>
            </div>
            <div className="space-y-2">
              <div><strong>VIN:</strong> {data.vin || 'N/A'}</div>
              <div><strong>Ownership Type:</strong> {data.vehicle_ownership === 'lease' ? 'Lease' : data.vehicle_ownership === 'owned' ? 'Owned' : 'N/A'}</div>
              <div><strong>Annual Mileage:</strong> {data.annual_mileage || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      {/* 驾驶员信息 */}
      {data.drivers && data.drivers.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Driver Information ({data.drivers.length} {data.drivers.length === 1 ? 'Driver' : 'Drivers'})
          </h3>
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

      {/* Remarks信息 - 重要突出显示 */}
      {data.remarks && (
        <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Remarks & Additional Information</h3>
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm whitespace-pre-line text-gray-800">{data.remarks.replace(/\\n/g, '\n')}</p>
          </div>
        </div>
      )}

      {/* 支付信息 */}
      {data.payment_info && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><strong>Annual Premium:</strong> {data.payment_info.annual_premium || 'N/A'}</div>
            <div><strong>Monthly Payment:</strong> {data.payment_info.monthly_payment || 'N/A'}</div>
            <div><strong>Payment Type:</strong> {data.payment_info.payment_type === 'annual' ? 'Annual' : data.payment_info.payment_type === 'monthly' ? 'Monthly' : 'N/A'}</div>
          </div>
        </div>
      )}

      {/* 签名信息 */}
      {data.signatures && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Signature Information</h3>
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

      {/* 向后兼容的保险保障信息 */}
      {data.insurance_coverages && !data.vehicles?.length && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Insurance Coverage Information (Legacy Format)</h3>
          <div className="space-y-4">
            <div>
              <div><strong>Liability:</strong> {data.insurance_coverages.liability_amount || 'N/A'}</div>
            </div>
            
            {data.insurance_coverages.loss_or_damage && (
              <div>
                <h5 className="font-medium text-gray-800 mb-2">Loss or Damage Coverage</h5>
                {(() => {
                  const { comprehensive, collision, all_perils } = data.insurance_coverages.loss_or_damage;
                  
                  const hasAllPerils = all_perils?.covered;
                  const hasComprehensive = comprehensive?.covered;
                  const hasCollision = collision?.covered;
                  const hasSeparateCoverage = hasComprehensive && hasCollision;
                  
                  if (hasAllPerils) {
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

      {/* 向后兼容的附加条款 */}
      {data.policy_change_forms && !data.vehicles?.length && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Policy Change Forms (Legacy Format)</h3>
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
    </div>
  );
} 