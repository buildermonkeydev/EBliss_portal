'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  HardDrive,
  Server,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Zap,
  Thermometer,
  Droplets,
  Loader2,
  ChevronRight,
  ChevronDown,
  Activity
} from 'lucide-react'
import { LayoutWrapper } from '../../components/layout/LayoutWrapper'
import { cn } from '@/lib/utils'
import api from '../../lib/api'
import { adminGetAllPOPs, Pop } from '../../lib/pops'

interface RackDevice {
  id: string
  name: string
  type: 'server' | 'switch' | 'firewall' | 'storage' | 'pdu' | 'router' | 'other'
  position: number
  size_u: number
  status: 'online' | 'offline' | 'maintenance' | 'provisioning' | 'error'
  power_draw_watts?: number
  metadata?: any
  created_at: string
}

interface Rack {
  id: string
  name: string
  datacenter: string
  location: string
  total_units: number
  used_units: number
  available_units: number
  power_capacity_kw: number
  power_used_kw: number
  temperature_c?: number
  humidity_percent?: number
  status: 'operational' | 'maintenance' | 'offline' | 'full'
  last_inspection?: string
  created_at: string
  updated_at: string
  devices: RackDevice[]
  utilization_percent?: number
  power_utilization_percent?: number
  available_positions?: number[]
}

interface RackStatistics {
  total_racks: number
  total_units: number
  used_units: number
  available_units: number
  utilization_percent: number
  total_power_capacity_kw: number
  total_power_used_kw: number
  power_utilization_percent: number
  total_devices: number
  by_datacenter: any[]
  by_status: Record<string, number>
  devices_by_type: Record<string, number>
}

interface CreateRackDto {
  name: string
  datacenter: string
  location: string
  total_units?: number
  power_capacity_kw?: number
  temperature_c?: number
  humidity_percent?: number
  status?: string
}

interface CreateDeviceDto {
  name: string
  type: string
  position: number
  size_u: number
  status?: string
  power_draw_watts?: number
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  operational: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2, label: 'Operational' },
  maintenance: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: AlertCircle, label: 'Maintenance' },
  offline: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400', icon: XCircle, label: 'Offline' },
  full: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Server, label: 'Full' },
}

const deviceTypeConfig: Record<string, { color: string; label: string }> = {
  server: { color: 'bg-blue-500', label: 'Server' },
  switch: { color: 'bg-purple-500', label: 'Switch' },
  firewall: { color: 'bg-red-500', label: 'Firewall' },
  storage: { color: 'bg-green-500', label: 'Storage' },
  pdu: { color: 'bg-yellow-500', label: 'PDU' },
  router: { color: 'bg-cyan-500', label: 'Router' },
  other: { color: 'bg-gray-500', label: 'Other' },
}

const deviceStatusConfig: Record<string, { color: string; label: string }> = {
  online: { color: 'bg-green-500', label: 'Online' },
  offline: { color: 'bg-gray-500', label: 'Offline' },
  maintenance: { color: 'bg-yellow-500', label: 'Maintenance' },
  provisioning: { color: 'bg-blue-500', label: 'Provisioning' },
  error: { color: 'bg-red-500', label: 'Error' },
}

export default function ManageRackPage() {
  const router = useRouter()
  const [racks, setRacks] = useState<Rack[]>([])
  const [statistics, setStatistics] = useState<RackStatistics | null>(null)
  const [pops, setPops] = useState<Pop[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPops, setLoadingPops] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDatacenter, setSelectedDatacenter] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [expandedRack, setExpandedRack] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Form states
  const [formData, setFormData] = useState<CreateRackDto>({
    name: '',
    datacenter: '',
    location: '',
    total_units: 42,
    power_capacity_kw: 10,
  })

  const [deviceForm, setDeviceForm] = useState<CreateDeviceDto>({
    name: '',
    type: 'server',
    position: 1,
    size_u: 2,
    status: 'online',
    power_draw_watts: 0,
  })

  const statuses = ['all', 'operational', 'maintenance', 'offline', 'full']
  const deviceTypes = ['server', 'switch', 'firewall', 'storage', 'pdu', 'router', 'other']

  // Fetch POPs (Datacenters)
  useEffect(() => {
    const fetchPops = async () => {
      try {
        setLoadingPops(true)
        const response = await adminGetAllPOPs()
        // Handle the API response structure
        const popsData = (response as any).data || response || []
        setPops(popsData.filter((pop: Pop) => pop.active))
      } catch (error) {
        console.error('Failed to fetch datacenters:', error)
      } finally {
        setLoadingPops(false)
      }
    }
    fetchPops()
  }, [])

  const fetchRacks = useCallback(async () => {
    try {
      setLoading(true)
      const [racksRes, statsRes] = await Promise.all([
        api.get('/racks', {
          params: {
            datacenter: selectedDatacenter === 'all' ? undefined : selectedDatacenter,
            status: selectedStatus === 'all' ? undefined : selectedStatus,
            search: searchTerm || undefined,
          },
        }),
        api.get('/racks/statistics'),
      ])
      setRacks(racksRes.data.racks || [])
      setStatistics(statsRes.data)
    } catch (error) {
      console.error('Failed to fetch racks:', error)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedDatacenter, selectedStatus])

  useEffect(() => {
    fetchRacks()
  }, [fetchRacks])

  const handleCreateRack = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await api.post('/racks', formData)
      setShowCreateModal(false)
      setFormData({ name: '', datacenter: '', location: '', total_units: 42, power_capacity_kw: 10 })
      fetchRacks()
    } catch (error) {
      console.error('Failed to create rack:', error)
      alert('Failed to create rack')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteRack = async (id: string) => {
    setActionLoading(true)
    try {
      await api.delete(`/racks/${id}`)
      setShowDeleteConfirm(null)
      fetchRacks()
    } catch (error: any) {
      console.error('Failed to delete rack:', error)
      alert(error.response?.data?.message || 'Failed to delete rack')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateRackStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/racks/${id}/status`, { status })
      fetchRacks()
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status')
    }
  }

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRack) return
    
    setActionLoading(true)
    try {
      await api.post(`/racks/${selectedRack.id}/devices`, deviceForm)
      setShowDeviceModal(false)
      setDeviceForm({ name: '', type: 'server', position: 1, size_u: 2, status: 'online', power_draw_watts: 0 })
      fetchRacks()
    } catch (error: any) {
      console.error('Failed to add device:', error)
      alert(error.response?.data?.message || 'Failed to add device')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteDevice = async (rackId: string, deviceId: string) => {
    if (!confirm('Remove this device from the rack?')) return
    
    try {
      await api.delete(`/racks/${rackId}/devices/${deviceId}`)
      fetchRacks()
    } catch (error) {
      console.error('Failed to remove device:', error)
      alert('Failed to remove device')
    }
  }

  const handleInspection = async (id: string) => {
    try {
      await api.post(`/racks/${id}/inspection`)
      fetchRacks()
    } catch (error) {
      console.error('Failed to log inspection:', error)
    }
  }

  const filteredRacks = racks.filter(rack => {
    const matchesSearch = rack.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rack.location.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  // Get unique datacenters from racks for filter dropdown
  const datacenters = ['all', ...new Set(racks.map(r => r.datacenter).filter(Boolean))]

  if (loading && racks.length === 0) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rack Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage server racks across all datacenters
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Rack
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Racks</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics?.total_racks || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Space Utilization</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {statistics?.utilization_percent.toFixed(1) || 0}%
            </p>
            <p className="text-xs text-gray-500">{statistics?.used_units || 0}/{statistics?.total_units || 0} U</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Power Utilization</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {statistics?.power_utilization_percent.toFixed(1) || 0}%
            </p>
            <p className="text-xs text-gray-500">{statistics?.total_power_used_kw.toFixed(1) || 0}/{statistics?.total_power_capacity_kw || 0} kW</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Devices</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{statistics?.total_devices || 0}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search racks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={selectedDatacenter}
                onChange={(e) => setSelectedDatacenter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {datacenters.map(dc => (
                  <option key={dc} value={dc}>{dc === 'all' ? 'All Datacenters' : dc}</option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Racks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRacks.map((rack) => {
            const status = statusConfig[rack.status] || statusConfig.operational
            const StatusIcon = status.icon
            const isExpanded = expandedRack === rack.id

            return (
              <div
                key={rack.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Rack Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <HardDrive className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{rack.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <MapPin size={12} />
                          {rack.datacenter} · {rack.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        status.color
                      )}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                      <button
                        onClick={() => setExpandedRack(isExpanded ? null : rack.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Space</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={cn(
                              "h-2 rounded-full",
                              rack.utilization_percent && rack.utilization_percent > 90 ? "bg-red-500" : 
                              rack.utilization_percent && rack.utilization_percent > 70 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${rack.utilization_percent || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {rack.used_units}/{rack.total_units}U
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Power</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={cn(
                              "h-2 rounded-full",
                              rack.power_utilization_percent && rack.power_utilization_percent > 90 ? "bg-red-500" : 
                              rack.power_utilization_percent && rack.power_utilization_percent > 70 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${rack.power_utilization_percent || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {rack.power_used_kw.toFixed(1)}/{rack.power_capacity_kw}kW
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Temperature</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Thermometer size={14} className={cn(
                          rack.temperature_c && rack.temperature_c > 25 ? "text-orange-500" : "text-green-500"
                        )} />
                        <span className="text-sm text-gray-900 dark:text-white">{rack.temperature_c || '—'}°C</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Humidity</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Droplets size={14} className="text-blue-500" />
                        <span className="text-sm text-gray-900 dark:text-white">{rack.humidity_percent || '—'}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setSelectedRack(rack)
                        setShowDeviceModal(true)
                      }}
                      className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Device
                    </button>
                    <select
                      value={rack.status}
                      onChange={(e) => handleUpdateRackStatus(rack.id, e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                    >
                      <option value="operational">Operational</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="offline">Offline</option>
                    </select>
                    <button
                      onClick={() => handleInspection(rack.id)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Log Inspection"
                    >
                      <Activity size={16} />
                    </button>
                    <button
                      onClick={() => router.push(`/admin/colocation/rack/${rack.id}/edit`)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(rack.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Expanded View - Rack Units */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">Rack Units</h4>
                      <div className="flex items-center gap-4">
                        {Object.entries(deviceTypeConfig).slice(0, 4).map(([type, config]) => (
                          <div key={type} className="flex items-center gap-1">
                            <div className={cn("w-3 h-3 rounded", config.color)}></div>
                            <span className="text-xs text-gray-500">{config.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rack Units Grid */}
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                      {Array.from({ length: rack.total_units }, (_, i) => rack.total_units - i).map((unitNum) => {
                        const device = rack.devices.find(d => 
                          unitNum >= d.position && unitNum < d.position + d.size_u
                        )
                        const isDeviceStart = device && device.position === unitNum
                        
                        return (
                          <div
                            key={unitNum}
                            className={cn(
                              "flex items-center px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 last:border-b-0",
                              device ? 'bg-opacity-20' : ''
                            )}
                            style={device ? { backgroundColor: deviceTypeConfig[device.type]?.color + '20' } : {}}
                          >
                            <span className="w-12 text-xs font-mono text-gray-500">{unitNum}</span>
                            <div className="flex-1 flex items-center gap-2">
                              {isDeviceStart ? (
                                <>
                                  <div className={cn(
                                    "w-3 h-3 rounded",
                                    deviceTypeConfig[device.type]?.color
                                  )} />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {device.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({device.size_u}U) - {deviceTypeConfig[device.type]?.label}
                                  </span>
                                  <div className={cn(
                                    "ml-auto w-2 h-2 rounded-full",
                                    deviceStatusConfig[device.status]?.color
                                  )} />
                                  {device.power_draw_watts ? (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Zap size={10} />
                                      {device.power_draw_watts}W
                                    </span>
                                  ) : null}
                                  <button
                                    onClick={() => handleDeleteDevice(rack.id, device.id)}
                                    className="ml-2 p-1 text-gray-400 hover:text-red-500 rounded"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              ) : device ? (
                                <div className="h-6" />
                              ) : (
                                <>
                                  <div className="w-3 h-3 rounded bg-gray-300 dark:bg-gray-600" />
                                  <span className="text-sm text-gray-400">Empty</span>
                                  <button
                                    onClick={() => {
                                      setSelectedRack(rack)
                                      setDeviceForm({ ...deviceForm, position: unitNum })
                                      setShowDeviceModal(true)
                                    }}
                                    className="ml-auto text-xs text-blue-500 hover:underline"
                                  >
                                    + Add
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Last Inspection */}
                    {rack.last_inspection && (
                      <p className="text-xs text-gray-500 mt-3">
                        Last inspection: {new Date(rack.last_inspection).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filteredRacks.length === 0 && (
          <div className="text-center py-12">
            <HardDrive className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No racks found</p>
          </div>
        )}
      </div>

      {/* Create Rack Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Rack</h3>
            <form onSubmit={handleCreateRack} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rack Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Datacenter</label>
                <select
                  value={formData.datacenter}
                  onChange={(e) => setFormData({ ...formData, datacenter: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
                  required
                  disabled={loadingPops}
                >
                  <option value="">{loadingPops ? 'Loading datacenters...' : 'Select Datacenter'}</option>
                  {pops.map((pop) => (
                    <option key={pop.id} value={pop.name}>
                      {pop.name} - {pop.city}, {pop.country}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Floor 2, Row A"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Units (U)</label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={formData.total_units}
                    onChange={(e) => setFormData({ ...formData, total_units: parseInt(e.target.value) || 42 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Power Capacity (kW)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.power_capacity_kw}
                    onChange={(e) => setFormData({ ...formData, power_capacity_kw: parseFloat(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                >
                  {actionLoading && <Loader2 size={16} className="animate-spin" />}
                  Create Rack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {showDeviceModal && selectedRack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Device to {selectedRack.name}
            </h3>
            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Device Name</label>
                <input
                  type="text"
                  value={deviceForm.name}
                  onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Device Type</label>
                <select
                  value={deviceForm.type}
                  onChange={(e) => setDeviceForm({ ...deviceForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
                >
                  {deviceTypes.map(type => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position (U)</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedRack.total_units}
                    value={deviceForm.position}
                    onChange={(e) => setDeviceForm({ ...deviceForm, position: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Size (U)</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedRack.total_units}
                    value={deviceForm.size_u}
                    onChange={(e) => setDeviceForm({ ...deviceForm, size_u: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={deviceForm.status}
                    onChange={(e) => setDeviceForm({ ...deviceForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="provisioning">Provisioning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Power Draw (W)</label>
                  <input
                    type="number"
                    min="0"
                    value={deviceForm.power_draw_watts}
                    onChange={(e) => setDeviceForm({ ...deviceForm, power_draw_watts: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowDeviceModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                >
                  {actionLoading && <Loader2 size={16} className="animate-spin" />}
                  Add Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Rack</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete this rack? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRack(showDeleteConfirm)}
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