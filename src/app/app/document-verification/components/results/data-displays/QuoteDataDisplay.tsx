'use client';

import { QuoteData } from '../../../types';

interface QuoteDataDisplayProps {
  data: QuoteData;
}

interface VehicleAssignment {
  vehicleIndex: number;
  vehicleName: string;
  role: 'prn' | 'occ';
}

interface DriverWithAssignments {
  name: string;
  role?: 'prn' | 'occ';
  birth_date?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  relationship_to_applicant?: string | null;
  licence_number?: string | null;
  licence_province?: string | null;
  licence_class?: string | null;
  date_g1?: string | null;
  date_g2?: string | null;
  date_g?: string | null;
  date_insured?: string | null;
  current_carrier?: string | null;
  date_with_company?: string | null;
  occupation?: string | null;
  claims?: Array<{
    description: string;
    date: string;
    at_fault: boolean;
    vehicle_involved: string;
    tp_pd?: string | null;
    ab?: string | null;
    coll?: string | null;
  }>;
  lapses?: Array<{
    description: string;
    date: string;
    duration_months: number;
    re_instate_date: string;
  }>;
  convictions?: Array<{
    description: string;
    date: string;
    kmh?: string | null;
    severity?: string | null;
  }>;
  vehicleAssignments?: VehicleAssignment[];
}

export default function QuoteDataDisplay({ data }: QuoteDataDisplayProps) {
  // 收集所有唯一的驾驶员（去重）
  const getAllDrivers = (): DriverWithAssignments[] => {
    const driversMap = new Map<string, DriverWithAssignments>();
    
    data.vehicles?.forEach((vehicle, vehicleIndex) => {
      vehicle.drivers?.forEach((driver) => {
        if (driver.name && !driversMap.has(driver.name)) {
          driversMap.set(driver.name, {
            ...driver,
            vehicleAssignments: []
          });
        }
        // 添加车辆分配信息
        if (driver.name && driversMap.has(driver.name)) {
          const existingDriver = driversMap.get(driver.name)!;
          existingDriver.vehicleAssignments?.push({
            vehicleIndex,
            vehicleName: vehicle.vehicle_year && vehicle.vehicle_make && vehicle.vehicle_model 
              ? `${vehicle.vehicle_year} ${vehicle.vehicle_make} ${vehicle.vehicle_model}`
              : `Vehicle ${vehicleIndex + 1}`,
            role: driver.role || 'prn'
          });
        }
      });
    });
    
    return Array.from(driversMap.values());
  };

  const allDrivers = getAllDrivers();
  
  return (
    <div className="space-y-8">
      {/* 驾驶员限制提示 */}
      {data.driver_limit_notice && (
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

      {/* 车辆概览部分 */}
      {data.vehicles && data.vehicles.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Vehicles ({data.vehicles.length})
          </h3>
          
          <div className="space-y-6">
            {data.vehicles.map((vehicle, vehicleIndex) => (
              <div key={vehicleIndex} className="border border-gray-100 rounded-lg p-4 bg-gray-50">
                {/* 车辆标题 */}
                <div className="mb-4">
                  <h4 className="text-base font-medium text-gray-900">
                    Vehicle {vehicleIndex + 1} of {data.vehicles.length}
                    {vehicle.vehicle_year && vehicle.vehicle_make && vehicle.vehicle_model && (
                      <span className="text-gray-600 ml-2">
                        | {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                      </span>
                    )}
                  </h4>
                </div>

                {/* 车辆基本信息网格 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <div className="text-gray-500">VIN</div>
                    <div className="font-medium">{vehicle.vin || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Garaging</div>
                    <div className="font-medium">{vehicle.garaging_location || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Annual km</div>
                    <div className="font-medium">{vehicle.annual_km || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Daily km</div>
                    <div className="font-medium">{vehicle.daily_km || 'N/A'}</div>
                  </div>
                </div>

                {/* 购买和特征信息网格 */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-sm border-t border-gray-200 pt-3">
                  <div>
                    <div className="text-gray-500">Purchase Condition</div>
                    <div className="font-medium">
                      <span className={`px-2 py-1 rounded text-xs ${
                        vehicle.purchase_condition === 'New' ? 'bg-green-100 text-green-800' :
                        vehicle.purchase_condition === 'Used' ? 'bg-blue-100 text-blue-800' :
                        vehicle.purchase_condition === 'Demo' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {vehicle.purchase_condition || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Purchase Date</div>
                    <div className="font-medium">{vehicle.purchase_date || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">List Price New</div>
                    <div className="font-medium">{vehicle.list_price_new ? `$${vehicle.list_price_new}` : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Winter Tires</div>
                    <div className="font-medium">
                      <span className={`px-2 py-1 rounded text-xs ${
                        vehicle.winter_tires ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {vehicle.winter_tires !== null ? (vehicle.winter_tires ? 'Yes' : 'No') : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Parking at Night</div>
                    <div className="font-medium">{vehicle.parking_at_night || 'N/A'}</div>
                  </div>
                </div>

                {/* 驾驶员列表 */}
                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-2">Drivers</div>
                  <div className="flex flex-wrap gap-2">
                    {vehicle.drivers && vehicle.drivers.length > 0 ? (
                      vehicle.drivers.map((driver, driverIndex) => (
                        <span key={driverIndex} className={`px-3 py-1 rounded-full text-sm ${
                          driver.role === 'prn' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {driver.name} ({driver.role === 'prn' ? 'Prn' : 'Occ'})
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">No drivers assigned</span>
                    )}
                  </div>
                </div>

                {/* 简化的Coverage信息 */}
                {vehicle.coverages && (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="text-sm text-gray-500 mb-2">Key Coverages</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {vehicle.coverages.bodily_injury && (
                        <div>Bodily Injury: ${vehicle.coverages.bodily_injury.amount}</div>
                      )}
                      {vehicle.coverages.loss_or_damage?.collision && (
                        <div>Collision: ${vehicle.coverages.loss_or_damage.collision.deductible}</div>
                      )}
                      {vehicle.coverages.loss_or_damage?.comprehensive && (
                        <div>Comprehensive: ${vehicle.coverages.loss_or_damage.comprehensive.deductible}</div>
                      )}
                      {vehicle.coverages.direct_compensation && (
                        <div>Direct Comp: ${vehicle.coverages.direct_compensation.deductible}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 驾驶员详细信息部分 */}
      {allDrivers.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Driver Details ({allDrivers.length})
          </h3>
          
          <div className="space-y-8">
            {allDrivers.map((driver, driverIndex) => (
              <div key={driverIndex} className="border border-gray-100 rounded-lg p-6 bg-gray-50">
                {/* 驾驶员标题 */}
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-base font-medium text-gray-900">
                    Driver {driverIndex + 1} of {allDrivers.length} | {driver.name}
                  </h4>
                                     <div className="flex gap-2">
                     {driver.vehicleAssignments?.map((assignment: VehicleAssignment, idx: number) => (
                       <span key={idx} className={`px-2 py-1 rounded text-xs ${
                         assignment.role === 'prn' 
                           ? 'bg-blue-100 text-blue-800' 
                           : 'bg-green-100 text-green-800'
                       }`}>
                         {assignment.vehicleName}: {assignment.role === 'prn' ? 'Principal' : 'Occasional'}
                       </span>
                     ))}
                   </div>
                </div>

                {/* 个人信息网格 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* 基本信息 */}
                  <div>
                    <h5 className="font-medium text-gray-800 text-sm mb-3">Personal Information</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Birth Date:</span>
                        <span>{driver.birth_date || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Gender:</span>
                        <span>{driver.gender || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Marital Status:</span>
                        <span>{driver.marital_status || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Relationship:</span>
                        <span>{driver.relationship_to_applicant || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Occupation:</span>
                        <span>{driver.occupation || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 驾照信息 */}
                  <div>
                    <h5 className="font-medium text-gray-800 text-sm mb-3">License Information</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">License Number:</span>
                        <span className="font-mono text-xs">{driver.licence_number || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Province:</span>
                        <span>{driver.licence_province || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Class:</span>
                        <span>{driver.licence_class || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date G1:</span>
                        <span>{driver.date_g1 || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date G2:</span>
                        <span>{driver.date_g2 || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date G:</span>
                        <span>{driver.date_g || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 保险历史 */}
                  <div>
                    <h5 className="font-medium text-gray-800 text-sm mb-3">Insurance History</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date Insured:</span>
                        <span>{driver.date_insured || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Current Carrier:</span>
                        <span>{driver.current_carrier || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date with Company:</span>
                        <span>{driver.date_with_company || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Claims, Lapses, Convictions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Claims */}
                  <div>
                    <h5 className="font-medium text-gray-800 text-sm mb-3">Claims</h5>
                                         {driver.claims && driver.claims.length > 0 ? (
                       <div className="space-y-3">
                         {driver.claims.map((claim: NonNullable<DriverWithAssignments['claims']>[0], claimIndex: number) => (
                           <div key={claimIndex} className="border border-gray-200 rounded-lg p-3 bg-white">
                             <div className="flex justify-between items-start mb-2">
                               <span className="font-medium text-sm">{claim.description}</span>
                               <span className={`px-2 py-1 rounded text-xs ${
                                 claim.at_fault ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                               }`}>
                                 {claim.at_fault ? 'At Fault' : 'NAF'}
                               </span>
                             </div>
                             <div className="text-xs text-gray-600 space-y-1">
                               <div>Date: {claim.date}</div>
                               <div>Vehicle: {claim.vehicle_involved}</div>
                               {claim.tp_pd && <div>TP/PD: ${claim.tp_pd}</div>}
                               {claim.ab && <div>AB: ${claim.ab}</div>}
                               {claim.coll && <div>Coll: ${claim.coll}</div>}
                             </div>
                           </div>
                         ))}
                       </div>
                    ) : (
                      <div className="text-gray-500 text-sm italic">No claims</div>
                    )}
                  </div>

                  {/* Lapses */}
                  <div>
                    <h5 className="font-medium text-gray-800 text-sm mb-3">Lapses</h5>
                                         {driver.lapses && driver.lapses.length > 0 ? (
                       <div className="space-y-3">
                         {driver.lapses.map((lapse: NonNullable<DriverWithAssignments['lapses']>[0], lapseIndex: number) => (
                           <div key={lapseIndex} className="border-l-4 border-yellow-400 pl-3 py-2 bg-yellow-50 rounded">
                             <div className="font-medium text-sm">{lapse.description}</div>
                             <div className="text-xs text-gray-600 mt-1">
                               From: {lapse.date}<br />
                               Duration: {lapse.duration_months} months<br />
                               Reinstate: {lapse.re_instate_date}
                             </div>
                           </div>
                         ))}
                       </div>
                    ) : (
                      <div className="text-gray-500 text-sm italic">No lapses</div>
                    )}
                  </div>

                  {/* Convictions */}
                  <div>
                    <h5 className="font-medium text-gray-800 text-sm mb-3">Convictions</h5>
                                         {driver.convictions && driver.convictions.length > 0 ? (
                       <div className="space-y-3">
                         {driver.convictions.map((conviction: NonNullable<DriverWithAssignments['convictions']>[0], convictionIndex: number) => (
                           <div key={convictionIndex} className="border-l-4 border-red-400 pl-3 py-2 bg-red-50 rounded">
                             <div className="font-medium text-sm">{conviction.description}</div>
                             <div className="text-xs text-gray-600 mt-1">
                               Date: {conviction.date}<br />
                               Speed: {conviction.kmh} km/h<br />
                               Severity: {conviction.severity}
                             </div>
                           </div>
                         ))}
                       </div>
                    ) : (
                      <div className="text-gray-500 text-sm italic">No convictions</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 如果没有数据 */}
      {(!data.vehicles || data.vehicles.length === 0) && (
        <div className="text-center py-12 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No quote data found</h3>
          <p className="mt-1 text-sm text-gray-500">Upload and process a quote document to view the data here.</p>
        </div>
      )}
    </div>
  );
} 