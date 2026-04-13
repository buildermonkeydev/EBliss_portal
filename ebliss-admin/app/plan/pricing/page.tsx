'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Percent,
  TrendingUp,
  Loader2,
  Plus,
  Trash2,
  Calendar,
  Tag
} from 'lucide-react'
import api from '../../lib/api'
import { cn } from '@/lib/utils'
import { LayoutWrapper } from '../../components/layout/LayoutWrapper'

interface BillingCycle {
  id: string
  name: string
  months: number
  discount_percentage: number
  is_active: boolean
  is_default: boolean
  badge?: string
}

interface Addon {
  id: string
  name: string
  description: string
  price_per_unit: number
  unit_type: string
  category: string
  is_active: boolean
}

export default function PricingRulesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Billing Cycles
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([
    { id: '1', name: 'Monthly', months: 1, discount_percentage: 0, is_active: true, is_default: true, badge: 'Pay as you go' },
    { id: '2', name: 'Quarterly', months: 3, discount_percentage: 5, is_active: true, is_default: false, badge: 'Save 5%' },
    { id: '3', name: 'Half-Yearly', months: 6, discount_percentage: 10, is_active: true, is_default: false, badge: 'Save 10%' },
    { id: '4', name: 'Yearly', months: 12, discount_percentage: 20, is_active: true, is_default: false, badge: 'Best Value' },
  ])

  // Add-ons
  const [addons, setAddons] = useState<Addon[]>([
    { id: '1', name: 'Additional Public IP', description: 'Extra IPv4 address', price_per_unit: 50, unit_type: 'per_month', category: 'networking', is_active: true },
    { id: '2', name: 'Extra Bandwidth', description: 'Additional bandwidth in TB', price_per_unit: 100, unit_type: 'per_tb', category: 'bandwidth', is_active: true },
    { id: '3', name: 'Additional Storage', description: 'Extra NVMe storage in GB', price_per_unit: 10, unit_type: 'per_gb', category: 'storage', is_active: true },
    { id: '4', name: 'Backup Service', description: 'Automated daily backups', price_per_unit: 200, unit_type: 'per_month', category: 'backup', is_active: true },
    { id: '5', name: 'DDoS Protection Pro', description: 'Advanced DDoS mitigation', price_per_unit: 500, unit_type: 'per_month', category: 'security', is_active: true },
  ])

  // Tax Configuration
  const [taxConfig, setTaxConfig] = useState({
    gst_percentage: 18,
    enable_gst: true,
    gst_number: '27AABCU9603R1ZM',
    display_prices_with_tax: false
  })

  const addBillingCycle = () => {
    const newCycle: BillingCycle = {
      id: Date.now().toString(),
      name: 'New Cycle',
      months: 1,
      discount_percentage: 0,
      is_active: true,
      is_default: false
    }
    setBillingCycles([...billingCycles, newCycle])
  }

  const updateBillingCycle = (id: string, field: keyof BillingCycle, value: any) => {
    setBillingCycles(billingCycles.map(cycle =>
      cycle.id === id ? { ...cycle, [field]: value } : cycle
    ))
  }

  const removeBillingCycle = (id: string) => {
    setBillingCycles(billingCycles.filter(cycle => cycle.id !== id))
  }

  const addAddon = () => {
    const newAddon: Addon = {
      id: Date.now().toString(),
      name: 'New Add-on',
      description: '',
      price_per_unit: 0,
      unit_type: 'per_month',
      category: 'other',
      is_active: true
    }
    setAddons([...addons, newAddon])
  }

  const updateAddon = (id: string, field: keyof Addon, value: any) => {
    setAddons(addons.map(addon =>
      addon.id === id ? { ...addon, [field]: value } : addon
    ))
  }

  const removeAddon = (id: string) => {
    setAddons(addons.filter(addon => addon.id !== id))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/admin/plans/pricing-config', {
        billing_cycles: billingCycles,
        addons: addons,
        tax_config: taxConfig
      })
      // Show success message
      setTimeout(() => {
        setSaving(false)
        router.push('/admin/plans')
      }, 1000)
    } catch (error) {
      console.error('Failed to save pricing config:', error)
      setSaving(false)
    }
  }

  return (
       <LayoutWrapper>
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pricing Rules</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure billing cycles, discounts, add-ons, and tax settings
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save Changes
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* Billing Cycles */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Billing Cycles</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Configure billing periods and discount percentages
              </p>
            </div>
            <button
              onClick={addBillingCycle}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-sm"
            >
              <Plus size={16} />
              Add Cycle
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Months</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Discount %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Badge</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Default</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {billingCycles.map((cycle) => (
                  <tr key={cycle.id}>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={cycle.name}
                        onChange={(e) => updateBillingCycle(cycle.id, 'name', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        value={cycle.months}
                        onChange={(e) => updateBillingCycle(cycle.id, 'months', parseInt(e.target.value))}
                        className="w-24 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={cycle.discount_percentage}
                          onChange={(e) => updateBillingCycle(cycle.id, 'discount_percentage', parseInt(e.target.value))}
                          className="w-20 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                        />
                        <Percent size={14} className="text-gray-400" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={cycle.badge || ''}
                        onChange={(e) => updateBillingCycle(cycle.id, 'badge', e.target.value)}
                        placeholder="e.g., Save 5%"
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cycle.is_active}
                          onChange={(e) => updateBillingCycle(cycle.id, 'is_active', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="radio"
                        name="default_cycle"
                        checked={cycle.is_default}
                        onChange={() => {
                          setBillingCycles(billingCycles.map(c => ({
                            ...c,
                            is_default: c.id === cycle.id
                          })))
                        }}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeBillingCycle(cycle.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        disabled={cycle.is_default && billingCycles.length === 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Preview (Based on ₹1,000/month plan)</h3>
            <div className="flex flex-wrap gap-4">
              {billingCycles.filter(c => c.is_active).map((cycle) => {
                const basePrice = 1000 * cycle.months
                const discount = basePrice * (cycle.discount_percentage / 100)
                const finalPrice = basePrice - discount
                return (
                  <div key={cycle.id} className="flex-1 min-w-[150px] p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{cycle.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{cycle.months} month{cycle.months > 1 ? 's' : ''}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                      ₹{finalPrice.toFixed(0)}
                    </p>
                    {cycle.discount_percentage > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Save {cycle.discount_percentage}% (₹{discount.toFixed(0)})
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Add-ons */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add-ons & Extras</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Configure additional services customers can add to their VM
              </p>
            </div>
            <button
              onClick={addAddon}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-sm"
            >
              <Plus size={16} />
              Add Add-on
            </button>
          </div>

          <div className="space-y-3">
            {addons.map((addon) => (
              <div key={addon.id} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={addon.name}
                      onChange={(e) => updateAddon(addon.id, 'name', e.target.value)}
                      placeholder="Add-on name"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={addon.description}
                      onChange={(e) => updateAddon(addon.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={addon.price_per_unit}
                        onChange={(e) => updateAddon(addon.id, 'price_per_unit', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addon.is_active}
                        onChange={(e) => updateAddon(addon.id, 'is_active', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                    <button
                      onClick={() => removeAddon(addon.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tax Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tax Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GST Percentage
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={taxConfig.gst_percentage}
                  onChange={(e) => setTaxConfig({ ...taxConfig, gst_percentage: parseInt(e.target.value) })}
                  className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
                <Percent size={16} className="text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GST Number
              </label>
              <input
                type="text"
                value={taxConfig.gst_number}
                onChange={(e) => setTaxConfig({ ...taxConfig, gst_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="e.g., 27AABCU9603R1ZM"
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={taxConfig.enable_gst}
                onChange={(e) => setTaxConfig({ ...taxConfig, enable_gst: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable GST Calculation
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={taxConfig.display_prices_with_tax}
                onChange={(e) => setTaxConfig({ ...taxConfig, display_prices_with_tax: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Display prices inclusive of GST
              </span>
            </label>
          </div>

          {/* Tax Preview */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">Tax Calculation Example</h3>
            <div className="space-y-1 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                Base Price: ₹1,000
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                GST ({taxConfig.gst_percentage}%): ₹{(1000 * taxConfig.gst_percentage / 100).toFixed(0)}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                Total: ₹{(1000 + (1000 * taxConfig.gst_percentage / 100)).toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </LayoutWrapper>
  )
}