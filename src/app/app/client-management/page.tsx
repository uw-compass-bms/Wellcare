'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { getCases, getMVRRecordsByCase, MVRRecord, CaseRecord, deleteMVRRecord } from '@/lib/supabase/client'

export default function ClientManagementPage() {
  const { user } = useUser()
  const [cases, setCases] = useState<CaseRecord[]>([])
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null)
  const [mvrRecords, setMvrRecords] = useState<MVRRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  // 获取案例列表
  useEffect(() => {
    if (user) {
      loadCases()
    }
  }, [user])

  const loadCases = async () => {
    try {
      setLoading(true)
      const casesData = await getCases(user!.id)
      setCases(casesData)
    } catch (err) {
      setError('Failed to load cases')
      console.error('Failed to load cases:', err)
    } finally {
      setLoading(false)
    }
  }

  // 获取MVR记录
  const loadMvrRecords = async (caseId: string) => {
    try {
      setLoading(true)
      const mvrData = await getMVRRecordsByCase(caseId)
      setMvrRecords(mvrData)
    } catch (err) {
      setError('Failed to load MVR records')
      console.error('Failed to load MVR records:', err)
    } finally {
      setLoading(false)
    }
  }

  // 删除MVR记录
  const handleDeleteMvrRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this MVR record?')) {
      return
    }

    try {
      setDeleteLoading(recordId)
      await deleteMVRRecord(recordId)
      
      // 重新加载MVR记录列表
      if (selectedCase) {
        await loadMvrRecords(selectedCase.id)
      }
      
      // 重新加载案例列表以更新计数
      await loadCases()
      
    } catch (err) {
      setError('Failed to delete MVR record')
      console.error('Failed to delete MVR record:', err)
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleCaseSelect = (caseRecord: CaseRecord) => {
    setSelectedCase(caseRecord)
    loadMvrRecords(caseRecord.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">MVR Data Management</h1>
      
      {/* 案例选择 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Select Case</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((caseRecord) => (
            <div
              key={caseRecord.id}
              onClick={() => handleCaseSelect(caseRecord)}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedCase?.id === caseRecord.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">{caseRecord.case_number}</div>
              <div className="text-sm text-gray-600">{caseRecord.primary_contact_name || 'Unknown Contact'}</div>
              <div className="text-sm text-gray-500 mt-2">
                MVR Records: {caseRecord.mvr_count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MVR记录展示 */}
      {selectedCase && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Case {selectedCase.case_number} - MVR Records ({mvrRecords.length})
          </h2>
          
          {mvrRecords.length === 0 ? (
            <div className="text-gray-500">No MVR records found for this case</div>
          ) : (
            <div className="space-y-6">
              {mvrRecords.map((record) => (
                <MvrRecordCard 
                  key={record.id} 
                  record={record} 
                  onDelete={handleDeleteMvrRecord}
                  deleteLoading={deleteLoading === record.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// MVR记录卡片组件
function MvrRecordCard({ 
  record, 
  onDelete, 
  deleteLoading 
}: { 
  record: MVRRecord
  onDelete: (recordId: string) => Promise<void>
  deleteLoading: boolean
}) {
  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      {/* 头部删除按钮 */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-medium">MVR Record</h3>
        <button
          onClick={() => onDelete(record.id)}
          disabled={deleteLoading}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            deleteLoading
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-red-100 text-red-600 hover:bg-red-200'
          }`}
        >
          {deleteLoading ? 'Deleting...' : 'Delete'}
        </button>
      </div>

      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <div className="text-sm">{record.name || 'Unknown'}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
          <div className="text-sm">{record.licence_number || 'Unknown'}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <div className="text-sm">{record.gender || 'Unknown'}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <div className="text-sm">{record.date_of_birth || 'Unknown'}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">License Class</label>
          <div className="text-sm">{record.class || 'Unknown'}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <div className="text-sm">{record.status || 'Unknown'}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
          <div className="text-sm">{record.issue_date || 'Unknown'}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
          <div className="text-sm">{record.expiry_date || 'Unknown'}</div>
        </div>
      </div>

      {/* 地址 */}
      {record.address && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <div className="text-sm whitespace-pre-line">{record.address}</div>
        </div>
      )}

      {/* 违规条件 */}
      {record.conditions && record.conditions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Conditions ({record.conditions.length})</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {record.conditions.map((condition, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {condition.date || 'Unknown'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {condition.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 定罪记录 */}
      {record.convictions && record.convictions.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">Convictions ({record.convictions.length})</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {record.convictions.map((conviction, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {conviction.date || 'Unknown'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {conviction.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 文件信息 */}
      {record.file_name && (
        <div className="mt-6 pt-4 border-t">
          <div className="text-sm text-gray-500">
            Source File: {record.file_name}
          </div>
        </div>
      )}
    </div>
  )
}
