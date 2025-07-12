'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { 
  MVRRecord,
  getMVRRecords,
  deleteMVRRecord
} from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  FileText, 
  Calendar, 
  User, 
  AlertTriangle, 
  Gavel, 
  Eye, 
  Trash2,
  Plus,
  ArrowRight
} from 'lucide-react'

// Case summary interface for overview display
interface CaseSummary {
  id: string
  client_name: string | null
  licence_number: string | null
  total_documents: number
  document_types: {
    mvr: number
    autoplus: number
    quote: number
    application: number
  }
  last_updated: string
  created_at: string
}

export default function CaseManagement() {
  const { user } = useUser()
  
  // State management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mvrRecords, setMvrRecords] = useState<MVRRecord[]>([])
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'details'>('overview')

  // Load MVR records and transform to case summaries
  const loadCaseData = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      setError(null)
      
      // Load MVR records (will expand to other document types later)
      const mvrData = await getMVRRecords(user.id)
      setMvrRecords(mvrData)
      
      console.log('✅ Loaded case data - MVR records:', mvrData.length)
    } catch (err) {
      console.error('Error loading case data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load case data')
    } finally {
      setLoading(false)
    }
  }

  // Transform MVR records to case summaries
  const getCaseSummaries = (): CaseSummary[] => {
    // Group MVR records by client (licence_number + name combination)
    const caseMap = new Map<string, CaseSummary>()
    
    mvrRecords.forEach(record => {
      const caseKey = `${record.licence_number || 'unknown'}_${record.name || 'unknown'}`
      
      if (caseMap.has(caseKey)) {
        const existingCase = caseMap.get(caseKey)!
        existingCase.total_documents += 1
        existingCase.document_types.mvr += 1
        // Update last_updated if this record is newer
        if (new Date(record.updated_at) > new Date(existingCase.last_updated)) {
          existingCase.last_updated = record.updated_at
        }
      } else {
        caseMap.set(caseKey, {
          id: caseKey,
          client_name: record.name,
          licence_number: record.licence_number,
          total_documents: 1,
          document_types: {
            mvr: 1,
            autoplus: 0,
            quote: 0,
            application: 0
          },
          last_updated: record.updated_at,
          created_at: record.created_at
        })
      }
    })
    
    return Array.from(caseMap.values()).sort((a, b) => 
      new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
    )
  }

  // Get MVR records for a specific case
  const getCaseMVRRecords = (caseId: string): MVRRecord[] => {
    const [licenceNumber, clientName] = caseId.split('_')
    return mvrRecords.filter(record => 
      (record.licence_number || 'unknown') === licenceNumber && 
      (record.name || 'unknown') === clientName
    )
  }

  // Delete MVR record
  const handleDeleteMVR = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this MVR record?')) return
    
    try {
      setError(null)
      await deleteMVRRecord(recordId)
      console.log('✅ Deleted MVR record:', recordId)
      await loadCaseData()
    } catch (err) {
      console.error('Error deleting MVR record:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete MVR record')
    }
  }

  // View case details
  const handleViewCase = (caseId: string) => {
    setSelectedCase(caseId)
    setViewMode('details')
  }

  // Back to overview
  const handleBackToOverview = () => {
    setSelectedCase(null)
    setViewMode('overview')
  }

  // Initial data load
  useEffect(() => {
    if (user?.id) {
      loadCaseData()
    }
  }, [user?.id])

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8">
          <p className="text-gray-500">Please sign in to access case management</p>
        </div>
      </div>
    )
  }

  const caseSummaries = getCaseSummaries()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader 
        title="Client Management" 
        description="Review and manage client document cases"
      />
      
      {/* Error display */}
      {error && (
        <Card className="mb-6 p-4 border-red-200 bg-red-50">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Navigation */}
      {viewMode === 'details' && (
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={handleBackToOverview}
            className="mb-4"
          >
            ← Back to Cases Overview
          </Button>
        </div>
      )}

      {/* Main content */}
      {viewMode === 'overview' ? (
        // Case Overview
        <Card className="p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Cases Overview</h2>
            <Button onClick={() => window.location.href = '/app/document-verification'}>
              <Plus className="w-4 h-4 mr-2" />
              New Document Extraction
            </Button>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading cases...</p>
            </div>
          ) : caseSummaries.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No cases found</p>
              <p className="text-sm text-gray-400">
                Start by extracting documents in the Document Verification section
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {caseSummaries.map((caseItem) => (
                <Card key={caseItem.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-lg">
                          {caseItem.client_name || 'Unknown Client'}
                        </h3>
                        <span className="text-sm text-gray-500">
                          License: {caseItem.licence_number || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">
                            MVR: {caseItem.document_types.mvr}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-green-500" />
                          <span className="text-sm">
                            Auto+: {caseItem.document_types.autoplus}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-500" />
                          <span className="text-sm">
                            Quote: {caseItem.document_types.quote}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-orange-500" />
                          <span className="text-sm">
                            App: {caseItem.document_types.application}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Updated: {new Date(caseItem.last_updated).toLocaleDateString()}
                        </div>
                        <div>
                          Total Documents: {caseItem.total_documents}
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handleViewCase(caseItem.id)}
                      className="ml-4"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      ) : (
        // Case Details View
        selectedCase && (
          <div className="space-y-6">
            {/* Case Header */}
            <Card className="p-6 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Case Details</h2>
                  <div className="flex items-center gap-4 text-gray-600">
                    <span>Client: {getCaseMVRRecords(selectedCase)[0]?.name || 'Unknown'}</span>
                    <span>License: {getCaseMVRRecords(selectedCase)[0]?.licence_number || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* MVR Records Section */}
            <Card className="p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                MVR Records ({getCaseMVRRecords(selectedCase).length})
              </h3>
              
              <div className="space-y-4">
                {getCaseMVRRecords(selectedCase).map((record) => (
                  <Card key={record.id} className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Name</label>
                            <p className="text-sm">{record.name || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Gender</label>
                            <p className="text-sm">{record.gender || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                            <p className="text-sm">{record.date_of_birth || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">License Class</label>
                            <p className="text-sm">{record.class || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Status</label>
                            <p className="text-sm">{record.status || 'N/A'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Issue Date</label>
                            <p className="text-sm">{record.issue_date || 'N/A'}</p>
                          </div>
                        </div>
                        
                        {/* Conditions */}
                        {record.conditions && record.conditions.length > 0 && (
                          <div className="mb-4">
                            <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                              Conditions ({record.conditions.length})
                            </label>
                            <div className="space-y-2">
                              {record.conditions.map((condition) => (
                                <div key={condition.id} className="bg-yellow-50 p-2 rounded border-l-2 border-yellow-300">
                                  <div className="text-sm">
                                    <span className="font-medium">
                                      {condition.condition_date || 'No date'}:
                                    </span>
                                    {' ' + condition.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Convictions */}
                        {record.convictions && record.convictions.length > 0 && (
                          <div className="mb-4">
                            <label className="text-sm font-medium text-gray-600 flex items-center gap-1 mb-2">
                              <Gavel className="w-4 h-4 text-red-500" />
                              Convictions ({record.convictions.length})
                            </label>
                            <div className="space-y-2">
                              {record.convictions.map((conviction) => (
                                <div key={conviction.id} className="bg-red-50 p-2 rounded border-l-2 border-red-300">
                                  <div className="text-sm">
                                    <span className="font-medium">
                                      {conviction.conviction_date || 'No date'}:
                                    </span>
                                    {' ' + conviction.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          File: {record.file_name || 'Unknown'} | 
                          Created: {new Date(record.created_at).toLocaleString()}
                        </div>
                      </div>
                      
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteMVR(record.id)}
                        className="ml-4"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        )
      )}
    </div>
  )
} 