'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Loader2,
  Star,
  GripVertical
} from 'lucide-react'
import api from '../../lib/api'
import { cn } from '@/lib/utils'
import { LayoutWrapper } from '../../components/layout/LayoutWrapper'


interface Feature {
  id: string
  text: string
  included: boolean
}

export default function CreatePlanPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    tagline: '',
    category: 'starter' as 'starter' | 'business' | 'pro' | 'enterprise' | 'custom',
    is_popular: false,
    is_active: true,
    sort_order: 0,
    
    pricing: {
      monthly: 0,
      quarterly: 0,
      half_yearly: 0,
      yearly: 0
    },
    
    specs: {
      vcpu: 1,
      ram_gb: 1,
      storage_gb: 10,
      storage_type: 'NVMe',
      bandwidth_tb: 1,
      ipv4_count: 1
    }
  })
  
  const [features, setFeatures] = useState<Feature[]>([
    { id: '1', text: 'Basic DDoS Protection', included: true },
    { id: '2', text: '24/7 Support', included: true },
    { id: '3', text: 'SSD Storage', included: true },
  ])
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const categories = [
    { value: 'starter', label: 'Starter' },
    { value: 'business', label: 'Business' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' },
    { value: 'custom', label: 'Custom' },
  ]

  const storageTypes = ['NVMe', 'SSD', 'HDD']

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const calculateDiscountedPrices = (monthly: number) => {
    setFormData({
      ...formData,
      pricing: {
        monthly,
        quarterly: Math.round(monthly * 3 * 0.95), // 5% off
        half_yearly: Math.round(monthly * 6 * 0.90), // 10% off
        yearly: Math.round(monthly * 12 * 0.80) // 20% off (Best Value)
      }
    })
  }

  const addFeature = () => {
    const newFeature: Feature = {
      id: Date.now().toString(),
      text: '',
      included: true
    }
    setFeatures([...features, newFeature])
  }

  const updateFeature = (id: string, field: keyof Feature, value: any) => {
    setFeatures(features.map(f => 
      f.id === id ? { ...f, [field]: value } : f
    ))
  }

  const removeFeature = (id: string) => {
    setFeatures(features.filter(f => f.id !== id))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name) newErrors.name = 'Plan name is required'
    if (!formData.description) newErrors.description = 'Description is required'
    if (formData.pricing.monthly <= 0) newErrors.monthly = 'Valid monthly price is required'
    if (formData.specs.vcpu < 1) newErrors.vcpu = 'At least 1 vCPU is required'
    if (formData.specs.ram_gb < 1) newErrors.ram = 'At least 1 GB RAM is required'
    if (formData.specs.storage_gb < 10) newErrors.storage = 'At least 10 GB storage is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    
    try {
      const planData = {
        ...formData,
        slug: generateSlug(formData.name),
        features: features.filter(f => f.included).map(f => f.text)
      }
      
      await api.post('/admin/plans', planData)
      router.push('/admin/plans')
    } catch (error) {
      console.error('Failed to create plan:', error)
      setErrors({ submit: 'Failed to create plan. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <LayoutWrapper>
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create VM Plan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Define a new virtual machine plan with pricing and specifications
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Plan Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      name: e.target.value,
                      slug: generateSlug(e.target.value)
                    })
                  }}
                  className={cn(
                    "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                    errors.name 
                      ? "border-red-500 focus:ring-red-500" 
                      : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  )}
                  placeholder="e.g., Starter"
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tagline
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Perfect for small websites and personal projects"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className={cn(
                  "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                  errors.description 
                    ? "border-red-500 focus:ring-red-500" 
                    : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                )}
                placeholder="Detailed description of the plan"
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description}</p>
              )}
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_popular}
                  onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mark as Popular
                </span>
                <Star size={16} className="text-yellow-500" />
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pricing</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Monthly Price (₹) *
              </label>
              <input
                type="number"
                value={formData.pricing.monthly}
                onChange={(e) => calculateDiscountedPrices(parseFloat(e.target.value) || 0)}
                className={cn(
                  "w-full md:w-64 px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                  errors.monthly 
                    ? "border-red-500 focus:ring-red-500" 
                    : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                )}
                placeholder="0"
              />
              {errors.monthly && (
                <p className="text-sm text-red-500 mt-1">{errors.monthly}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quarterly (3 months)
                </label>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{formData.pricing.quarterly.toLocaleString()}
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-400">5% off</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ₹{Math.round(formData.pricing.quarterly / 3).toLocaleString()}/mo equivalent
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Half-Yearly (6 months)
                </label>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{formData.pricing.half_yearly.toLocaleString()}
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-400">10% off</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ₹{Math.round(formData.pricing.half_yearly / 6).toLocaleString()}/mo equivalent
                </p>
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Yearly (12 months) - Best Value
                </label>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{formData.pricing.yearly.toLocaleString()}
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-400">20% off</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ₹{Math.round(formData.pricing.yearly / 12).toLocaleString()}/mo equivalent
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Resource Specifications</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                vCPU Cores *
              </label>
              <input
                type="number"
                min="1"
                value={formData.specs.vcpu}
                onChange={(e) => setFormData({
                  ...formData,
                  specs: { ...formData.specs, vcpu: parseInt(e.target.value) || 1 }
                })}
                className={cn(
                  "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                  errors.vcpu 
                    ? "border-red-500 focus:ring-red-500" 
                    : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                )}
              />
              {errors.vcpu && (
                <p className="text-sm text-red-500 mt-1">{errors.vcpu}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                RAM (GB) *
              </label>
              <input
                type="number"
                min="1"
                value={formData.specs.ram_gb}
                onChange={(e) => setFormData({
                  ...formData,
                  specs: { ...formData.specs, ram_gb: parseInt(e.target.value) || 1 }
                })}
                className={cn(
                  "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                  errors.ram 
                    ? "border-red-500 focus:ring-red-500" 
                    : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                )}
              />
              {errors.ram && (
                <p className="text-sm text-red-500 mt-1">{errors.ram}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Storage (GB) *
              </label>
              <input
                type="number"
                min="10"
                value={formData.specs.storage_gb}
                onChange={(e) => setFormData({
                  ...formData,
                  specs: { ...formData.specs, storage_gb: parseInt(e.target.value) || 10 }
                })}
                className={cn(
                  "w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white",
                  errors.storage 
                    ? "border-red-500 focus:ring-red-500" 
                    : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                )}
              />
              {errors.storage && (
                <p className="text-sm text-red-500 mt-1">{errors.storage}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Storage Type
              </label>
              <select
                value={formData.specs.storage_type}
                onChange={(e) => setFormData({
                  ...formData,
                  specs: { ...formData.specs, storage_type: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {storageTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bandwidth (TB/month)
              </label>
              <input
                type="number"
                min="1"
                value={formData.specs.bandwidth_tb}
                onChange={(e) => setFormData({
                  ...formData,
                  specs: { ...formData.specs, bandwidth_tb: parseInt(e.target.value) || 1 }
                })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Public IPv4 Addresses
              </label>
              <input
                type="number"
                min="1"
                value={formData.specs.ipv4_count}
                onChange={(e) => setFormData({
                  ...formData,
                  specs: { ...formData.specs, ipv4_count: parseInt(e.target.value) || 1 }
                })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Features</h2>
            <button
              type="button"
              onClick={addFeature}
              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-sm"
            >
              <Plus size={16} />
              Add Feature
            </button>
          </div>
          
          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={feature.id} className="flex items-center gap-3">
                <GripVertical size={16} className="text-gray-400 cursor-move" />
                <input
                  type="checkbox"
                  checked={feature.included}
                  onChange={(e) => updateFeature(feature.id, 'included', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={feature.text}
                  onChange={(e) => updateFeature(feature.id, 'text', e.target.value)}
                  placeholder="Feature description"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeFeature(feature.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Preview:</strong> Only checked features will be displayed to customers
            </p>
            <ul className="mt-2 space-y-1">
              {features.filter(f => f.included).map(f => (
                <li key={f.id} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <span className="text-green-500">✓</span> {f.text || '(Empty feature)'}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Submit */}
        {errors.submit && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            {errors.submit}
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save size={18} />
                Create Plan
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
    </LayoutWrapper>
  )
}