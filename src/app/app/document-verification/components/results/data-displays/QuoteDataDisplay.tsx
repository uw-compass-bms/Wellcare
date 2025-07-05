'use client';

import { QuoteData } from '../../../types';

interface QuoteDataDisplayProps {
  data: QuoteData;
}

// 驾驶员整合信息类型
interface ConsolidatedDriver {
  name: string;
  personal_info: any; // 个人信息只保留一份
  vehicle_relationships: Array<{
    vehicle_index: number;
    vehicle_display: string;
    role: 'prn' | 'occ';
  }>;
  claims: any[];
  lapses: any[];
  convictions: any[];
}

export default function QuoteDataDisplay({ data }: QuoteDataDisplayProps) {
  // 检查是否有驾驶员超出限制的提示
  const hasDriverLimitNotice = data.driver_limit_notice;

  // 整合驾驶员信息 - 按姓名去重，保留所有车辆关系
  const consolidateDrivers = (): ConsolidatedDriver[] => {
    const driverMap = new Map<string, ConsolidatedDriver>();
    
    data.vehicles?.forEach((vehicle, vehicleIndex) => {
      const vehicleDisplay = vehicle.vehicle_year && vehicle.vehicle_make && vehicle.vehicle_model 
        ? `${vehicle.vehicle_year} ${vehicle.vehicle_make} ${vehicle.vehicle_model}`
        : `Vehicle ${vehicleIndex + 1}`;
      
      vehicle.drivers?.forEach((driver) => {
        const driverName = driver.name;
        if (!driverName) return;
        
        if (!driverMap.has(driverName)) {
          // 第一次遇到这个驾驶员，创建记录
          driverMap.set(driverName, {
            name: driverName,
            personal_info: driver, // 保存个人信息
            vehicle_relationships: [],
            claims: driver.claims || [],
            lapses: driver.lapses || [],
            convictions: driver.convictions || []
          });
        }
        
        // 添加车辆关系
        const consolidatedDriver = driverMap.get(driverName)!;
        consolidatedDriver.vehicle_relationships.push({
          vehicle_index: vehicleIndex,
          vehicle_display: vehicleDisplay,
          role: driver.role || 'prn'
        });
      });
    });
    
    return Array.from(driverMap.values());
  };

  const consolidatedDrivers = consolidateDrivers();
  
  return (
    <div className="space-y-6">
      {/* 驾驶员限制提示 */}
      {hasDriverLimitNotice && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Driver Limit Notice:</strong> {data.driver_limit_notice}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 多车辆多驾驶员嵌套展示 */}
      {data.vehicles && data.vehicles.length > 0 ? (
        <div className="space-y-8">
          {/* 车辆概览 */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Vehicle Overview ({data.vehicles.length} {data.vehicles.length === 1 ? 'Vehicle' : 'Vehicles'})
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.vehicles.map((vehicle, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Vehicle {index + 1}
                  </h4>
                  {vehicle.vehicle_year && vehicle.vehicle_make && vehicle.vehicle_model && (
                    <p className="text-sm text-gray-600 mb-3">
                      {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div><strong>VIN:</strong> {vehicle.vin || 'N/A'}</div>
                    <div><strong>Garaging:</strong> {vehicle.garaging_location || 'N/A'}</div>
                    <div><strong>Leased:</strong> {vehicle.leased !== null ? (vehicle.leased ? 'Yes' : 'No') : 'N/A'}</div>
                    {vehicle.annual_km && (
                      <div><strong>Annual Mileage:</strong> {vehicle.annual_km}</div>
                    )}
                    {vehicle.daily_km && (
                      <div><strong>Daily Commute:</strong> {vehicle.daily_km}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 驾驶员信息 */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Driver Information ({consolidatedDrivers.length} {consolidatedDrivers.length === 1 ? 'Driver' : 'Drivers'})
            </h3>

            {consolidatedDrivers.length > 0 ? (
              <div className="space-y-8">
                {consolidatedDrivers.map((driver, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    {/* 驾驶员姓名 */}
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      {driver.name}
                    </h4>

                    {/* 车辆关系 */}
                    <div className="mb-6">
                      <h5 className="font-medium text-gray-800 mb-3">Vehicle Relationships</h5>
                      <div className="flex flex-wrap gap-2">
                        {driver.vehicle_relationships.map((relationship, idx) => (
                          <span 
                            key={idx}
                            className={`px-3 py-1 rounded-full text-sm ${
                              relationship.role === 'prn' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {relationship.vehicle_display}: {relationship.role === 'prn' ? 'Principal' : 'Occasional'}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 个人信息 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div>
                          <h6 className="font-medium text-gray-800 mb-2">Personal Information</h6>
                          <div className="space-y-2 text-sm">
                            <div><strong>Birth Date:</strong> {driver.personal_info.birth_date || 'N/A'}</div>
                            <div><strong>Gender:</strong> {driver.personal_info.gender || 'N/A'}</div>
                            <div><strong>Marital Status:</strong> {driver.personal_info.marital_status || 'N/A'}</div>
                            <div><strong>Relationship:</strong> {driver.personal_info.relationship_to_applicant || 'N/A'}</div>
                            <div><strong>Occupation:</strong> {driver.personal_info.occupation || 'N/A'}</div>
                          </div>
                        </div>

                        <div>
                          <h6 className="font-medium text-gray-800 mb-2">License Information</h6>
                          <div className="space-y-2 text-sm">
                            <div><strong>License Number:</strong> {driver.personal_info.licence_number || 'N/A'}</div>
                            <div><strong>License Province:</strong> {driver.personal_info.licence_province || 'N/A'}</div>
                            <div><strong>License Class:</strong> {driver.personal_info.licence_class || 'N/A'}</div>
                          </div>
                        </div>

                        <div>
                          <h6 className="font-medium text-gray-800 mb-2">License Dates</h6>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div><strong>G1:</strong> {driver.personal_info.date_g1 || 'N/A'}</div>
                            <div><strong>G2:</strong> {driver.personal_info.date_g2 || 'N/A'}</div>
                            <div><strong>G:</strong> {driver.personal_info.date_g || 'N/A'}</div>
                          </div>
                        </div>

                        <div>
                          <h6 className="font-medium text-gray-800 mb-2">Insurance History</h6>
                          <div className="space-y-2 text-sm">
                            <div><strong>Date Insured:</strong> {driver.personal_info.date_insured || 'N/A'}</div>
                            <div><strong>Current Carrier:</strong> {driver.personal_info.current_carrier || 'N/A'}</div>
                            <div><strong>Date with Company:</strong> {driver.personal_info.date_with_company || 'N/A'}</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Claims */}
                        <div>
                          <h6 className="font-medium text-gray-800 mb-2">Claims</h6>
                          {driver.claims && driver.claims.length > 0 ? (
                            <div className="space-y-2">
                              {driver.claims.map((claim, claimIndex) => (
                                <div key={claimIndex} className="border border-gray-200 rounded p-3 bg-white">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-sm">{claim.description}</span>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      claim.at_fault ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                    }`}>
                                      {claim.at_fault ? 'At Fault' : 'Not At Fault'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    <div>Date: {claim.date}</div>
                                    <div>Vehicle: {claim.vehicle_involved}</div>
                                    <div>TP/PD: {claim.tp_pd || 'N/A'} | AB: {claim.ab || 'N/A'} | Coll: {claim.coll || 'N/A'}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-500 text-sm bg-white p-3 rounded border">None</div>
                          )}
                        </div>

                        {/* Lapses */}
                        <div>
                          <h6 className="font-medium text-gray-800 mb-2">Insurance Lapses</h6>
                          {driver.lapses && driver.lapses.length > 0 ? (
                            <div className="space-y-2">
                              {driver.lapses.map((lapse, lapseIndex) => (
                                <div key={lapseIndex} className="border-l-4 border-yellow-400 pl-3 py-2 bg-yellow-50 rounded">
                                  <div className="font-medium text-sm">{lapse.description}</div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    From: {lapse.date} | To: {lapse.re_instate_date} | Duration: {lapse.duration_months} months
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-500 text-sm bg-white p-3 rounded border">None</div>
                          )}
                        </div>

                        {/* Convictions */}
                        <div>
                          <h6 className="font-medium text-gray-800 mb-2">Convictions</h6>
                          {driver.convictions && driver.convictions.length > 0 ? (
                            <div className="space-y-2">
                              {driver.convictions.map((conviction, convictionIndex) => (
                                <div key={convictionIndex} className="border-l-4 border-red-400 pl-3 py-2 bg-red-50 rounded">
                                  <div className="font-medium text-sm">{conviction.description}</div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    Date: {conviction.date} | Speed: {conviction.kmh} km/h | Severity: {conviction.severity}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-500 text-sm bg-white p-3 rounded border">None</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No drivers found
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No vehicle data found
        </div>
      )}
    </div>
  );
} 