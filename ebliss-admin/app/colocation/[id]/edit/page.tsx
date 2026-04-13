'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Loader2,
  Building2,
  Zap,
  Wifi,
  Shield,
  Plus,
  Trash2,
  MapPin
} from 'lucide-react'
import { LayoutWrapper } from '../../../components/layout/LayoutWrapper'
import { getColocation, updateColocation, Colocation } from '../../../lib/colocation'
import { adminGetAllPOPs } from '../../../lib/pops'
import { getAvailableRacks, Rack } from '../../../lib/colocation'
import { cn } from '@/lib/utils'

interface Pop {
  id: number
  name: string
  city: string
  country: string
  active: boolean
}

interface PowerFeed {
  id?: string
  name: string
  voltage: number
  amperage: number
  phase: string
}

export default function EditColocationPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pops, setPops] = useState<Pop[]>([])
  const [racks, setRacks] = useState<Rack[]>([])
  const [selectedDatacenter, setSelectedDatacenter] = useState('')
  
  const [formData, setFormData] = useState({
    datacenter: '',
    rack_id: '',
    unit_position: '',
    unit_size: 4,
    cabinet_type: 'standard' as 'standard' | 'high_density' | 'secure',
    power_capacity_kw: 1.0,
    network_port: '1 Gbps',
    bandwidth_mbps: 1000,
    ipv4_allocation: '',
    ipv6_allocation: '',
    cross_connects: 0,
    access_level: 'full' as 'full' | 'restricted' | 'supervised',
    biometric_access: false,
    security_camera: true,
    cooling_type: '',
    monthly_price: 0,
    setup_fee: 0,
    power_cost_per_kwh: 8.5,
    cross_connect_fee: 0,
    sla_uptime_guarantee: 99.9,
    sla_credit_percent: 5,
    notes: '',
    tags: [] as string[],
  })

  const [powerFeeds, setPowerFeeds] = useState<PowerFeed[]>([])
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch colocation data
        const colocationData = await getColocation(id)
        
        // Fetch POPs
        const popsResponse = await adminGetAllPOPs()
        const popsData = (popsResponse as any).data || popsResponse || []
        setPops(popsData.filter((p: Pop) => p.active))
        
        setFormData({
          datacenter: colocationData.datacenter,
          rack_id: colocationData.rack_id,
          unit_position: colocationData.unit_position,
          unit_size: colocationData.unit_size,
          cabinet_type: colocationData.cabinet_type,
          power_capacity_kw: colocationData.power_capacity_kw,
          network_port: colocationData.network_port,
          bandwidth_mbps: colocationData.bandwidth_mbps,
          ipv4_allocation: colocationData.ipv4_allocation || '',
          ipv6_allocation: colocationData.ipv6_allocation || '',
          cross_connects: colocationData.cross_connects,
          access_level: colocationData.access_level,
          biometric_access: colocationData.biometric_access,
          security_camera: colocationData.security_camera,
          cooling_type: colocationData.cooling_type || '',
      monthly_price: colocationData.monthly_price,
setup_fee: colocationData.setup_fee,
power_cost_per_kwh: colocationData.power_cost_per_kwh,
cross_connect_fee: colocationData.cross_connect_fee,
          sla_uptime_guarantee: colocationData.sla_uptime_guarantee,
          sla_credit_percent: colocationData.sla_credit_percent,
          notes: colocationData.notes || '',
          tags: colocationData.tags || [],
        })
        
        setPowerFeeds(colocationData.power_feeds.map(feed => ({
          id: feed.id,
          name: feed.name,
          voltage: feed.voltage,
          amperage: feed.amperage,
          phase: feed.phase,
        })))
        
        setSelectedDatacenter(colocationData.datacenter)
        
        // Fetch racks for the datacenter
        if (colocationData.datacenter) {
          const racksData = await getAvailableRacks(colocationData.datacenter)
          setRacks(racksData)
        }
        
      } catch (error) {
        console.error('Failed to fetch data:', error)
        alert('Failed to load colocation data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [id])

  const handleDatacenterChange = async (datacenter: string) => {
    setSelectedDatacenter(datacenter)
    setFormData({ ...formData, datacenter, rack_id: '' })
    
    if (datacenter) {
      try {
        const racksData = await getAvailableRacks(datacenter)
        setRacks(racksData)
      } catch (error) {
        console.error('Failed to fetch racks:', error)
      }
    } else {
      setRacks([])
    }
  }

  const addPowerFeed = () => {
    setPowerFeeds([
      ...powerFeeds,
      { name: `Feed ${String.fromCharCode(65 + powerFeeds.length)}`, voltage: 230, amperage: 16, phase: 'single' }
    ])
  }

  const updatePowerFeed = (index: number, field: keyof PowerFeed, value: any) => {
    const updated = [...powerFeeds]
    updated[index] = { ...updated[index], [field]: value }
    setPowerFeeds(updated)
  }

  const removePowerFeed = (index: number) => {
    setPowerFeeds(powerFeeds.filter((_, i) => i !== index))
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] })
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.datacenter) newErrors.datacenter = 'Datacenter is required'
    if (!formData.rack_id) newErrors.rack_id = 'Rack is required'
    if (!formData.unit_position) newErrors.unit_position = 'Unit position is required'
    if (formData.unit_size < 1) newErrors.unit_size = 'Unit size must be at least 1'
    if (formData.monthly_price < 0) newErrors.monthly_price = 'Price must be positive'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setSaving(true)

    try {
      const totalPower = powerFeeds.reduce((sum, feed) => {
        const power = (feed.voltage * feed.amperage) / 1000
        return sum + power
      }, 0)

      await updateColocation(id, {
        ...formData,
        power_capacity_kw: totalPower,
        power_feeds: powerFeeds.map(feed => ({
          ...feed,
          power_kw: (feed.voltage * feed.amperage) / 1000,
          status: 'active' as const,
        })),
      })
      
      router.push(`/colocation/${id}`)
    } catch (error: any) {
      console.error('Failed to update colocation:', error)
      alert(error.response?.data?.message || 'Failed to update colocation')
    } finally {
      setSaving(false)
    }
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

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Colocation</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Update colocation space configuration
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 size={20} />
              Location
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Datacenter *
                </label>
                <select
                  value={formData.datacenter}
                  onChange={(e) => handleDatacenterChange(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                    errors.datacenter ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  )}
                >
                  <option value="">Select Datacenter</option>
                  {pops.map(pop => (
                    <option key={pop.id} value={pop.name}>{pop.name} - {pop.city}</option>
                  ))}
                </select>
                {errors.datacenter && <p className="text-sm text-red-500 mt-1">{errors.datacenter}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rack *
                </label>
                <select
                  value={formData.rack_id}
                  onChange={(e) => setFormData({ ...formData, rack_id: e.target.value })}
                  disabled={!selectedDatacenter}
                  className={cn(
                    "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white disabled:opacity-50",
                    errors.rack_id ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  )}
                >
                  <option value="">Select Rack</option>
                  {racks.map(rack => (
                    <option key={rack.id} value={rack.id}>
                      {rack.name} ({rack.available_units}U available)
                    </option>
                  ))}
                </select>
                {errors.rack_id && <p className="text-sm text-red-500 mt-1">{errors.rack_id}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit Position *
                </label>
                <input
                  type="text"
                  value={formData.unit_position}
                  onChange={(e) => setFormData({ ...formData, unit_position: e.target.value })}
                  placeholder="e.g., U12-U15"
                  className={cn(
                    "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                    errors.unit_position ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  )}
                />
                {errors.unit_position && <p className="text-sm text-red-500 mt-1">{errors.unit_position}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unit Size (U) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={formData.unit_size}
                  onChange={(e) => setFormData({ ...formData, unit_size: parseInt(e.target.value) || 1 })}
                  className={cn(
                    "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                    errors.unit_size ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  )}
                />
                {errors.unit_size && <p className="text-sm text-red-500 mt-1">{errors.unit_size}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cabinet Type
                </label>
                <select
                  value={formData.cabinet_type}
                  onChange={(e) => setFormData({ ...formData, cabinet_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="standard">Standard</option>
                  <option value="high_density">High Density</option>
                  <option value="secure">Secure</option>
                </select>
              </div>
            </div>
          </div>

          {/* Power Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap size={20} />
                Power Feeds
              </h2>
              <button
                type="button"
                onClick={addPowerFeed}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1"
              >
                <Plus size={16} />
                Add Feed
              </button>
            </div>
            
            <div className="space-y-4">
              {powerFeeds.map((feed, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900 dark:text-white">{feed.name}</span>
                    {powerFeeds.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePowerFeed(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Voltage (V)</label>
                      <input
                        type="number"
                        value={feed.voltage}
                        onChange={(e) => updatePowerFeed(index, 'voltage', parseInt(e.target.value) || 230)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Amperage (A)</label>
                      <input
                        type="number"
                        value={feed.amperage}
                        onChange={(e) => updatePowerFeed(index, 'amperage', parseInt(e.target.value) || 16)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Phase</label>
                      <select
                        value={feed.phase}
                        onChange={(e) => updatePowerFeed(index, 'phase', e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                      >
                        <option value="single">Single Phase</option>
                        <option value="three">Three Phase</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Estimated Power: {((feed.voltage * feed.amperage) / 1000).toFixed(2)} kW
                  </p>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Total Power Capacity: {powerFeeds.reduce((sum, feed) => sum + (feed.voltage * feed.amperage) / 1000, 0).toFixed(2)} kW
              </p>
            </div>
          </div>

          {/* Network */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Wifi size={20} />
              Network
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Port Speed</label>
                <select
                  value={formData.network_port}
                  onChange={(e) => setFormData({ ...formData, network_port: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="1 Gbps">1 Gbps</option>
                  <option value="10 Gbps">10 Gbps</option>
                  <option value="25 Gbps">25 Gbps</option>
                  <option value="40 Gbps">40 Gbps</option>
                  <option value="100 Gbps">100 Gbps</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bandwidth (Mbps)</label>
                <input
                  type="number"
                  value={formData.bandwidth_mbps}
                  onChange={(e) => setFormData({ ...formData, bandwidth_mbps: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">IPv4 Allocation</label>
                <input
                  type="text"
                  value={formData.ipv4_allocation}
                  onChange={(e) => setFormData({ ...formData, ipv4_allocation: e.target.value })}
                  placeholder="e.g., /29"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cross Connects</label>
                <input
                  type="number"
                  min="0"
                  value={formData.cross_connects}
                  onChange={(e) => setFormData({ ...formData, cross_connects: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Security & Access */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield size={20} />
              Security & Access
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Access Level</label>
                <select
                  value={formData.access_level}
                  onChange={(e) => setFormData({ ...formData, access_level: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="full">Full Access</option>
                  <option value="restricted">Restricted</option>
                  <option value="supervised">Supervised</option>
                </select>
              </div>
              
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.biometric_access}
                    onChange={(e) => setFormData({ ...formData, biometric_access: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Biometric Access</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.security_camera}
                    onChange={(e) => setFormData({ ...formData, security_camera: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Security Camera</span>
                </label>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pricing</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monthly Price (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_price}
                  onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) || 0 })}
                  className={cn(
                    "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                    errors.monthly_price ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                  )}
                />
                {errors.monthly_price && <p className="text-sm text-red-500 mt-1">{errors.monthly_price}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Setup Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.setup_fee}
                  onChange={(e) => setFormData({ ...formData, setup_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Notes & Tags */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="Additional notes..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                    placeholder="Add tag..."
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-900 dark:hover:text-blue-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </LayoutWrapper>
  )
}