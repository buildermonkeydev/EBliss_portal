'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  HardDrive,
  Zap,
  Wifi,
  MapPin,
  Clock,
  DollarSign,
  Shield,
  User,
  Mail,
  Building,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Activity,
  Thermometer,
  Droplets,
  Server
} from 'lucide-react'
import { LayoutWrapper } from '../../components/layout/LayoutWrapper'
import { getColocation, deleteColocation, updateColocationStatus, Colocation } from '../../lib/colocation'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
  active: { 
    color: 'text-green-700 dark:text-green-400', 
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle2, 
    label: 'Active' 
  },
  pending: { 
    color: 'text-blue-700 dark:text-blue-400', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: Clock, 
    label: 'Pending' 
  },
  suspended: { 
    color: 'text-orange-700 dark:text-orange-400', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: AlertCircle, 
    label: 'Suspended' 
  },
  terminated: { 
    color: 'text-gray-700 dark:text-gray-400', 
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: XCircle, 
    label: 'Terminated' 
  },
  maintenance: { 
    color: 'text-yellow-700 dark:text-yellow-400', 
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: AlertCircle, 
    label: 'Maintenance' 
  },
}

const cabinetTypeConfig: Record<string, string> = {
  standard: 'Standard',
  high_density: 'High Density',
  secure: 'Secure',
}

const accessLevelConfig: Record<string, { color: string; label: string }> = {
  full: { color: 'text-green-600', label: 'Full Access' },
  restricted: { color: 'text-yellow-600', label: 'Restricted' },
  supervised: { color: 'text-blue-600', label: 'Supervised' },
}

// Helper function to safely convert to number
const toNumber = (value: any): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return parseFloat(value) || 0
  return 0
}

// Helper function to format currency
const formatCurrency = (value: any): string => {
  const num = toNumber(value)
  return num.toLocaleString('en-IN')
}

// Helper function to format decimal
const formatDecimal = (value: any, decimals: number = 2): string => {
  const num = toNumber(value)
  return num.toFixed(decimals)
}

export default function ViewColocationPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [colocation, setColocation] = useState<Colocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  useEffect(() => {
    fetchColocation()
  }, [id])

  const fetchColocation = async () => {
    try {
      setLoading(true)
      const data = await getColocation(id)
      setColocation(data)
    } catch (error) {
      console.error('Failed to fetch colocation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setActionLoading(true)
      await deleteColocation(id)
      router.push('/colocation/list')
    } catch (error) {
      console.error('Failed to delete colocation:', error)
      alert('Failed to delete colocation')
    } finally {
      setActionLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    try {
      setActionLoading(true)
      await updateColocationStatus(id, status)
      fetchColocation()
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleString('en-IN')
  }

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </LayoutWrapper>
    )
  }

  if (!colocation) {
    return (
      <LayoutWrapper>
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Colocation not found</p>
          <button
            onClick={() => router.back()}
            className="mt-3 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Go back
          </button>
        </div>
      </LayoutWrapper>
    )
  }

  const status = statusConfig[colocation.status] || statusConfig.pending
  const StatusIcon = status.icon
  const accessLevel = accessLevelConfig[colocation.access_level] || accessLevelConfig.full

  // Convert string values to numbers for calculations
  const monthlyPrice = toNumber(colocation.monthly_price)
  const setupFee = toNumber(colocation.setup_fee)
  const powerCostPerKwh = toNumber(colocation.power_cost_per_kwh)
  const powerCapacityKw = toNumber(colocation.power_capacity_kw)
  const powerUsedKw = toNumber(colocation.power_used_kw)

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {colocation.rack_name || colocation.rack_id}
                </h1>
                <span className={cn(
                  "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
                  status.bgColor,
                  status.color
                )}>
                  <StatusIcon size={14} />
                  {status.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {colocation.datacenter} • Unit {colocation.unit_position} ({colocation.unit_size}U)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={colocation.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
              disabled={actionLoading}
            >
              <option value="active">Set Active</option>
              <option value="pending">Set Pending</option>
              <option value="maintenance">Set Maintenance</option>
              <option value="suspended">Suspend</option>
              <option value="terminated">Terminate</option>
            </select>
            <button
              onClick={() => router.push(`/colocation/${id}/edit`)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Edit size={16} />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left 2 Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Location & Rack Details */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin size={20} />
                Location & Rack Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Datacenter</p>
                  <p className="font-medium text-gray-900 dark:text-white">{colocation.datacenter}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rack</p>
                  <p className="font-medium text-gray-900 dark:text-white">{colocation.rack_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unit Position</p>
                  <p className="font-medium text-gray-900 dark:text-white">{colocation.unit_position}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unit Size</p>
                  <p className="font-medium text-gray-900 dark:text-white">{colocation.unit_size}U</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cabinet Type</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {cabinetTypeConfig[colocation.cabinet_type] || colocation.cabinet_type}
                  </p>
                </div>
                {colocation.rack_name && (
                  <div>
                    <p className="text-sm text-gray-500">Rack Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{colocation.rack_name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Power Configuration */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Zap size={20} />
                Power Configuration
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Power Capacity</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{powerCapacityKw.toFixed(2)} kW</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Usage</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{powerUsedKw.toFixed(2)} kW</p>
                    <span className="text-sm text-gray-500">
                      ({powerCapacityKw > 0 ? ((powerUsedKw / powerCapacityKw) * 100).toFixed(1) : '0'}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Power Feeds */}
              {colocation.power_feeds && colocation.power_feeds.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Power Feeds</h3>
                  <div className="space-y-3">
                    {colocation.power_feeds.map((feed) => (
                      <div key={feed.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900 dark:text-white">{feed.name}</span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            feed.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          )}>
                            {feed.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs">Voltage</p>
                            <p className="text-gray-900 dark:text-white">{feed.voltage}V</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Amperage</p>
                            <p className="text-gray-900 dark:text-white">{feed.amperage}A</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Phase</p>
                            <p className="text-gray-900 dark:text-white">{feed.phase}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 text-xs">Power</p>
                            <p className="text-gray-900 dark:text-white">{toNumber(feed.power_kw).toFixed(2)} kW</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Network Configuration */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Wifi size={20} />
                Network Configuration
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Port Speed</p>
                  <p className="font-medium text-gray-900 dark:text-white">{colocation.network_port}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bandwidth</p>
                  <p className="font-medium text-gray-900 dark:text-white">{colocation.bandwidth_mbps} Mbps</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Usage</p>
                  <p className="font-medium text-gray-900 dark:text-white">{colocation.bandwidth_used_mbps} Mbps</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cross Connects</p>
                  <p className="font-medium text-gray-900 dark:text-white">{colocation.cross_connects}</p>
                </div>
                {colocation.ipv4_allocation && (
                  <div>
                    <p className="text-sm text-gray-500">IPv4 Allocation</p>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-gray-900 dark:text-white">{colocation.ipv4_allocation}</code>
                      <button onClick={() => copyToClipboard(colocation.ipv4_allocation!)} className="p-1">
                        {copiedText === colocation.ipv4_allocation ? 
                          <Check size={14} className="text-green-500" /> : 
                          <Copy size={14} className="text-gray-400" />
                        }
                      </button>
                    </div>
                  </div>
                )}
                {colocation.ipv6_allocation && (
                  <div>
                    <p className="text-sm text-gray-500">IPv6 Allocation</p>
                    <code className="font-mono text-gray-900 dark:text-white">{colocation.ipv6_allocation}</code>
                  </div>
                )}
                {colocation.asn && (
                  <div>
                    <p className="text-sm text-gray-500">ASN</p>
                    <p className="font-medium text-gray-900 dark:text-white">AS{colocation.asn}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Client Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User size={20} />
                Client Information
              </h2>
              
              {colocation.assigned_to ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <User size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{colocation.assigned_to.full_name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail size={12} />
                        {colocation.assigned_to.email}
                      </p>
                    </div>
                  </div>
                  {colocation.assigned_to.company && (
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Building size={14} />
                      {colocation.assigned_to.company}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <User size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">Unassigned</p>
                  <button 
                    onClick={() => router.push(`/colocation/${id}/assign`)}
                    className="mt-3 text-blue-600 dark:text-blue-400 text-sm hover:underline"
                  >
                    Assign to Client
                  </button>
                </div>
              )}
            </div>

            {/* Security & Access */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Shield size={20} />
                Security & Access
              </h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Access Level</p>
                  <p className={cn("font-medium", accessLevel.color)}>{accessLevel.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  {colocation.biometric_access ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">Biometric Access</span>
                </div>
                <div className="flex items-center gap-2">
                  {colocation.security_camera ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <XCircle size={16} className="text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">Security Camera</span>
                </div>
              </div>
            </div>

            {/* Billing Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign size={20} />
                Billing
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly Price</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    ₹{formatCurrency(colocation.monthly_price)}
                  </span>
                </div>
                {setupFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Setup Fee</span>
                    <span className="text-gray-900 dark:text-white">
                      ₹{formatCurrency(colocation.setup_fee)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Power Cost</span>
                  <span className="text-gray-900 dark:text-white">
                    ₹{formatDecimal(colocation.power_cost_per_kwh)}/kWh
                  </span>
                </div>
                <hr className="border-gray-200 dark:border-gray-700" />
                {colocation.contract_start && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-gray-500">Contract:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatDate(colocation.contract_start)} - {formatDate(colocation.contract_end)}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  {colocation.auto_renew ? (
                    <CheckCircle2 size={14} className="text-green-500" />
                  ) : (
                    <XCircle size={14} className="text-gray-400" />
                  )}
                  <span className="text-gray-500">Auto-renew</span>
                </div>
              </div>
            </div>

            {/* Environment */}
            {(colocation.temperature_c || colocation.humidity_percent || colocation.cooling_type) && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity size={20} />
                  Environment
                </h2>
                
                <div className="space-y-3">
                  {colocation.temperature_c && (
                    <div className="flex items-center gap-2">
                      <Thermometer size={16} className="text-orange-500" />
                      <span className="text-gray-500">Temperature:</span>
                      <span className="text-gray-900 dark:text-white">{colocation.temperature_c}°C</span>
                    </div>
                  )}
                  {colocation.humidity_percent && (
                    <div className="flex items-center gap-2">
                      <Droplets size={16} className="text-blue-500" />
                      <span className="text-gray-500">Humidity:</span>
                      <span className="text-gray-900 dark:text-white">{colocation.humidity_percent}%</span>
                    </div>
                  )}
                  {colocation.cooling_type && (
                    <div>
                      <p className="text-sm text-gray-500">Cooling Type</p>
                      <p className="font-medium text-gray-900 dark:text-white">{colocation.cooling_type}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SLA */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">SLA</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Uptime Guarantee</span>
                  <span className="text-gray-900 dark:text-white">{colocation.sla_uptime_guarantee}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Credit Percentage</span>
                  <span className="text-gray-900 dark:text-white">{colocation.sla_credit_percent}%</span>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Timestamps</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-900 dark:text-white">{formatDateTime(colocation.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Updated</span>
                  <span className="text-gray-900 dark:text-white">{formatDateTime(colocation.updated_at)}</span>
                </div>
                {colocation.last_inspection && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Inspection</span>
                    <span className="text-gray-900 dark:text-white">{formatDateTime(colocation.last_inspection)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {colocation.notes && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Notes</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{colocation.notes}</p>
              </div>
            )}

            {/* Tags */}
            {colocation.tags && colocation.tags.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {colocation.tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Colocation</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete this colocation space? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
              >
                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutWrapper>
  )
}