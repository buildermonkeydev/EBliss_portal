'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Server,
  Zap,
  TrendingUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  MoreVertical
} from 'lucide-react'
import api from '../../lib/api'
import { cn } from '@/lib/utils'
import { LayoutWrapper } from '../../components/layout/LayoutWrapper'

interface Plan {
  id: string
  name: string
  slug: string
  description: string
  tagline?: string
  category: 'starter' | 'business' | 'pro' | 'enterprise' | 'custom'
  is_popular: boolean
  is_active: boolean
  sort_order: number
  
  // Pricing
  pricing: {
    monthly: number
    quarterly: number
    half_yearly: number
    yearly: number
  }
  
  // Resources
  specs: {
    vcpu: number
    ram_gb: number
    storage_gb: number
    storage_type: string
    bandwidth_tb: number
    ipv4_count: number
  }
  
  // Features
  features: string[]
  
  // Metadata
  created_at: string
  updated_at: string
}

const categoryColors = {
  starter: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  business: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pro: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  enterprise: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  custom: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

export default function AdminPlansPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPlans, setSelectedPlans] = useState<string[]>([])

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await api.get('/admin/plans')
      setPlans(response.data)
    } catch (error) {
      console.error('Failed to fetch plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return
    
    try {
      await api.delete(`/admin/plans/${id}`)
      setPlans(plans.filter(p => p.id !== id))
    } catch (error) {
      console.error('Failed to delete plan:', error)
    }
  }

  const handleDuplicate = async (plan: Plan) => {
    try {
      const response = await api.post('/admin/plans/duplicate', {
        ...plan,
        name: `${plan.name} (Copy)`,
        slug: `${plan.slug}-copy`,
        id: undefined
      })
      setPlans([...plans, response.data])
    } catch (error) {
      console.error('Failed to duplicate plan:', error)
    }
  }

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/admin/plans/${id}/status`, { is_active: !isActive })
      setPlans(plans.map(p => 
        p.id === id ? { ...p, is_active: !isActive } : p
      ))
    } catch (error) {
      console.error('Failed to toggle plan status:', error)
    }
  }

  const filteredPlans = plans
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => a.sort_order - b.sort_order)

  const categories = ['all', 'starter', 'business', 'pro', 'enterprise', 'custom']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
       <LayoutWrapper>
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">VM Plans</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage virtual machine plans and pricing
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/plans/pricing')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <TrendingUp size={18} />
            Pricing Rules
          </button>
          <button
            onClick={() => router.push('/plan/create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Plan
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all",
              plan.is_popular 
                ? "border-blue-500 dark:border-blue-400 shadow-blue-100 dark:shadow-blue-900/20 shadow-lg"
                : "border-gray-200 dark:border-gray-700"
            )}
          >
            {/* Plan Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {plan.tagline || plan.description}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {plan.is_popular && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                      Popular
                    </span>
                  )}
                  <button
                    onClick={() => router.push(`/admin/plans/${plan.id}/edit`)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit size={16} />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                <span className={cn(
                  "px-2 py-1 text-xs font-medium rounded",
                  categoryColors[plan.category]
                )}>
                  {plan.category.toUpperCase()}
                </span>
                {plan.is_active ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle2 size={12} />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <XCircle size={12} />
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Monthly</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ₹{plan.pricing.monthly.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Quarterly</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    ₹{plan.pricing.quarterly.toLocaleString()}
                    <span className="text-xs text-green-600 dark:text-green-400 ml-1">-5%</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Half-Yearly</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    ₹{plan.pricing.half_yearly.toLocaleString()}
                    <span className="text-xs text-green-600 dark:text-green-400 ml-1">-10%</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Yearly</p>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    ₹{plan.pricing.yearly.toLocaleString()}
                    <span className="text-xs text-green-600 dark:text-green-400 ml-1">Best</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Specs */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Resources</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">vCPU</p>
                  <p className="font-medium text-gray-900 dark:text-white">{plan.specs.vcpu} Cores</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">RAM</p>
                  <p className="font-medium text-gray-900 dark:text-white">{plan.specs.ram_gb} GB</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Storage</p>
                  <p className="font-medium text-gray-900 dark:text-white">{plan.specs.storage_gb} GB {plan.specs.storage_type}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Bandwidth</p>
                  <p className="font-medium text-gray-900 dark:text-white">{plan.specs.bandwidth_tb} TB</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Features</h4>
              <ul className="space-y-2">
                {plan.features.slice(0, 3).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">{feature}</span>
                  </li>
                ))}
                {plan.features.length > 3 && (
                  <li className="text-sm text-blue-600 dark:text-blue-400">
                    +{plan.features.length - 3} more features
                  </li>
                )}
              </ul>
            </div>

            {/* Actions */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push(`/admin/plans/${plan.id}`)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="View"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => handleDuplicate(plan)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Duplicate"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => handleToggleStatus(plan.id, plan.is_active)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    plan.is_active
                      ? "text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  )}
                  title={plan.is_active ? "Deactivate" : "Activate"}
                >
                  {plan.is_active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                </button>
              </div>
              <button
                onClick={() => handleDelete(plan.id)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredPlans.length === 0 && (
        <div className="text-center py-12">
          <Server className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No plans found</p>
          <button
            onClick={() => router.push('/plan/create')}
            className="mt-3 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Create your first plan
          </button>
        </div>
      )}
    </div>
</LayoutWrapper>
  )
}