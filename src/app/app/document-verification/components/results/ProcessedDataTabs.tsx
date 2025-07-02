"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Car, Calculator, FileCheck } from 'lucide-react';
import { DocumentType, DocumentState, MvrData, AutoPlusData, QuoteData, ApplicationData } from '../../types';

interface ProcessedDataTabsProps {
  documents: Record<DocumentType, DocumentState>;
}

export default function ProcessedDataTabs({ documents }: ProcessedDataTabsProps) {
  const [activeTab, setActiveTab] = useState<DocumentType | null>(null);

  // 文档配置
  const documentConfigs = [
    { type: 'mvr' as DocumentType, title: 'MVR Data', icon: FileText, color: 'text-blue-600' },
    { type: 'autoplus' as DocumentType, title: 'Auto+ Data', icon: Car, color: 'text-green-600' },
    { type: 'quote' as DocumentType, title: 'Quote Data', icon: Calculator, color: 'text-purple-600' },
    { type: 'application' as DocumentType, title: 'Application Data', icon: FileCheck, color: 'text-orange-600' }
  ];

  // 获取已上传的文档
  const uploadedDocs = documentConfigs.filter(config => documents[config.type].uploaded);

  // 设置默认激活标签
  React.useEffect(() => {
    if (uploadedDocs.length > 0 && !activeTab) {
      setActiveTab(uploadedDocs[0].type);
    }
  }, [uploadedDocs, activeTab]);

  if (uploadedDocs.length === 0) return null;

  // 渲染MVR数据
  const renderMvrData = (data: MvrData) => (
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
            <div><strong>Status:</strong> {data.status || 'N/A'}</div>
          </div>
        </div>
      </div>

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

      {/* 条件限制 */}
      {data.conditions && data.conditions.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">License Conditions</h4>
          <div className="space-y-2">
            {data.conditions.map((condition, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
                <p className="text-sm font-medium">{condition.description}</p>
                {condition.date && <p className="text-xs text-gray-500">Date: {condition.date}</p>}
              </div>
            ))}
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
                {conviction.date && <p className="text-xs text-gray-500">Date: {conviction.date}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // 渲染Auto+数据
  const renderAutoPlusData = (data: AutoPlusData) => (
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

  // 渲染Quote数据
  const renderQuoteData = (data: QuoteData) => (
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

  // 渲染Application数据
  const renderApplicationData = (data: ApplicationData) => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><strong>Liability:</strong> {data.insurance_coverages.liability_amount || 'N/A'}</div>
            <div><strong>Property Damage:</strong> {data.insurance_coverages.property_damage_amount || 'N/A'}</div>
          </div>
          
          {data.insurance_coverages.loss_or_damage && (
            <div>
              <h5 className="font-medium text-gray-800 mb-2">Loss or Damage Coverage</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['comprehensive', 'collision', 'all_perils'].map((coverageType) => {
                  const coverage = data.insurance_coverages?.loss_or_damage?.[coverageType as keyof typeof data.insurance_coverages.loss_or_damage];
                  const coverageNames = {
                    comprehensive: 'Comprehensive',
                    collision: 'Collision',
                    all_perils: 'All Perils'
                  };
                    
                    return (
                      <div key={coverageType} className="border rounded-lg p-3">
                        <h6 className="font-medium mb-2">{coverageNames[coverageType as keyof typeof coverageNames]}</h6>
                        {coverage ? (
                          <div className="space-y-1 text-sm">
                            <div><strong>Covered:</strong> {coverage.covered ? 'Yes' : 'No'}</div>
                            {coverage.covered && (
                              <>
                                <div><strong>Deductible:</strong> {coverage.deductible || 'N/A'}</div>
                                <div><strong>Premium:</strong> {coverage.premium || 'N/A'}</div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Not Covered</div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
          <div><strong>#20 Loss of Use:</strong> {data.policy_change_forms.loss_of_use || 'N/A'}</div>
          <div><strong>#27 Liab to Unowned Veh:</strong> {data.policy_change_forms.liab_to_unowned_veh || 'N/A'}</div>
          <div><strong>#43a Limited Waiver:</strong> {data.policy_change_forms.limited_waiver || 'N/A'}</div>
          <div><strong>#5a Rent or Lease:</strong> {data.policy_change_forms.rent_or_lease || 'N/A'}</div>
          <div><strong>Accident Waiver:</strong> {data.policy_change_forms.accident_waiver || 'N/A'}</div>
          <div><strong>Minor Conviction Protection:</strong> {data.policy_change_forms.minor_conviction_protection || 'N/A'}</div>
        </div>
      </div>
    )}

    {/* 支付信息 */}
    {data.payment_info && (
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Payment Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Annual Premium:</strong> {data.payment_info.annual_premium || 'N/A'}</div>
          <div><strong>Monthly Payment:</strong> {data.payment_info.monthly_payment || 'N/A'}</div>
          <div><strong>Has Interest:</strong> {data.payment_info.has_interest !== null ? (data.payment_info.has_interest ? 'Yes' : 'No') : 'N/A'}</div>
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

  // 渲染文档数据
  const renderDocumentData = (type: DocumentType) => {
    const documentState = documents[type];
    if (!documentState.data) return <div>No data available</div>;

    switch (type) {
      case 'mvr':
        return renderMvrData(documentState.data as MvrData);
      case 'autoplus':
        return renderAutoPlusData(documentState.data as AutoPlusData);
      case 'quote':
        return renderQuoteData(documentState.data as QuoteData);
      case 'application':
        return renderApplicationData(documentState.data as ApplicationData);
      default:
        return <div>Unknown document type</div>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracted Document Data</CardTitle>
        <CardDescription>
          Detailed view of processed information from uploaded documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 标签导航 */}
        <div className="flex space-x-1 mb-6 border-b">
          {uploadedDocs.map((config) => {
            const IconComponent = config.icon;
            return (
              <Button
                key={config.type}
                variant={activeTab === config.type ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(config.type)}
                className="flex items-center space-x-2"
              >
                <IconComponent className={`w-4 h-4 ${config.color}`} />
                <span>{config.title}</span>
              </Button>
            );
          })}
        </div>

        {/* 活动标签内容 */}
        {activeTab && (
          <div className="min-h-[400px]">
            {renderDocumentData(activeTab)}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 