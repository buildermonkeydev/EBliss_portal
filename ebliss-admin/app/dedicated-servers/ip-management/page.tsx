'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Copy,
  Globe,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Server
} from 'lucide-react'
import { LayoutWrapper } from '../../components/layout/LayoutWrapper'
import { cn } from '../../../lib/utils'

interface IPAddress {
  id: string
  address: string
  type: 'IPv4' | 'IPv6'
  status: 'active' | 'available' | 'reserved' | 'blocked'
  assigned_to?: {
    server_id: string
    server_name: string
    type: 'primary' | 'additional'
  }
  subnet: string
  gateway: string
  datacenter: string
  ptr_record?: string
  ddos_protection: boolean
  bandwidth_usage?: {
    in_mbps: number
    out_mbps: number
    total_gb: number
    limit_gb?: number
  }
  created_at: string
}

const staticIPs: IPAddress[] = [
  {
    id: 'IP-001',
    address: '103.127.42.101',
    type: 'IPv4',
    status: 'active',
    assigned_to: {
      server_id: 'DS-001',
      server_name: 'DELL-740-01',
      type: 'primary'
    },
    subnet: '103.127.42.0/24',
    gateway: '103.127.42.1',
    datacenter: 'HOST02-YTA',
    ptr_record: 'srv1.host02.yta',
    ddos_protection: true,
    bandwidth_usage: {
      in_mbps: 45.2,
      out_mbps: 128.7,
      total_gb: 125.5,
      limit_gb: 5000
    },
    created_at: '2024-03-10'
  },
  {
    id: 'IP-002',
    address: '103.127.42.102',
    type: 'IPv4',
    status: 'active',
    assigned_to: {
      server_id: 'DS-002',
      server_name: 'HP-DL380-03',
      type: 'primary'
    },
    subnet: '103.127.42.0/24',
    gateway: '103.127.42.1',
    datacenter: 'HOST02-YTA',
    ptr_record: 'srv2.host02.yta',
    ddos_protection: true,
    bandwidth_usage: {
      in_mbps: 158.3,
      out_mbps: 342.8,
      total_gb: 458.2,
      limit_gb: 10000
    },
    created_at: '2024-06-22'
  },
  {
    id: 'IP-003',
    address: '103.127.43.105',
    type: 'IPv4',
    status: 'active',
    assigned_to: {
      server_id: 'DS-003',
      server_name: 'SM-2029TP-02',
      type: 'primary'
    },
    subnet: '103.127.43.0/24',
    gateway: '103.127.43.1',
    datacenter: 'HOST01-MUM',
    ptr_record: 'srv3.host01.mum',
    ddos_protection: true,
    bandwidth_usage: {
      in_mbps: 356.8,
      out_mbps: 892.4,
      total_gb: 892.4,
      limit_gb: 20000
    },
    created_at: '2024-09-15'
  },
  {
    id: 'IP-004',
    address: '103.127.42.110',
    type: 'IPv4',
    status: 'available',
    subnet: '103.127.42.0/24',
    gateway: '103.127.42.1',
    datacenter: 'HOST02-YTA',
    ddos_protection: false,
    created_at: '2025-01-10'
  },
  {
    id: 'IP-005',
    address: '103.127.42.111',
    type: 'IPv4',
    status: 'available',
    subnet: '103.127.42.0/24',
    gateway: '103.127.42.1',
    datacenter: 'HOST02-YTA',
    ddos_protection: false,
    created_at: '2025-01-10'
  },
  {
    id: 'IP-006',
    address: '103.127.42.112',
    type: 'IPv4',
    status: 'reserved',
    subnet: '103.127.42.0/24',
    gateway: '103.127.42.1',
    datacenter: 'HOST02-YTA',
    ddos_protection: false,
    created_at: '2025-03-01'
  },
  {
    id: 'IP-007',
    address: '2402:1f00:8000:100::101',
    type: 'IPv6',
    status: 'active',
    assigned_to: {
      server_id: 'DS-001',
      server_name: 'DELL-740-01',
      type: 'additional'
    },
    subnet: '2402:1f00:8000:100::/64',
    gateway: '2402:1f00:8000:100::1',
    datacenter: 'HOST02-YTA',
    ddos_protection: true,
    created_at: '2024-03-10'
  },
  {
    id: 'IP-008',
    address: '103.127.44.201',
    type: 'IPv4',
    status: 'blocked',
    subnet: '103.127.44.0/24',
    gateway: '103.127.44.1',
    datacenter: 'HOST03-BLR',
    ddos_protection: false,
    created_at: '2025-02-15'
  },
  {
    id: 'IP-009',
    address: '103.127.43.120',
    type: 'IPv4',
    status: 'available',
    subnet: '103.127.43.0/24',
    gateway: '103.127.43.1',
    datacenter: 'HOST01-MUM',
    ddos_protection: true,
    created_at: '2025-04-01'
  },
  {
    id: 'IP-010',
    address: '103.127.43.121',
    type: 'IPv4',
    status: 'available',
    subnet: '103.127.43.0/24',
    gateway: '103.127.43.1',
    datacenter: 'HOST01-MUM',
    ddos_protection: true,
    created_at: '2025-04-01'
  },
  {
    id: 'IP-011',
    address: '103.127.44.210',
    type: 'IPv4',
    status: 'active',
    assigned_to: {
      server_id: 'DS-006',
      server_name: 'LEN-SR650-01',
      type: 'primary'
    },
    subnet: '103.127.44.0/24',
    gateway: '103.127.44.1',
    datacenter: 'HOST03-BLR',
    ptr_record: 'srv6.host01.mum',
    ddos_protection: true,
    bandwidth_usage: {
      in_mbps: 98.5,
      out_mbps: 256.3,
      total_gb: 256.3,
      limit_gb: 15000
    },
    created_at: '2025-01-18'
  }
]

const statusConfig = {
  active: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2, label: 'Active' },
  available: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Globe, label: 'Available' },
  reserved: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock, label: 'Reserved' },
  blocked: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, label: 'Blocked' }
}

export default function IPManagementPage() {
  const router = useRouter()
  const [ips, setIPs] = useState<IPAddress[]>(staticIPs)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDatacenter, setSelectedDatacenter] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  const datacenters = ['all', 'HOST01-MUM', 'HOST02-YTA', 'HOST03-BLR']
  const statuses = ['all', 'active', 'available', 'reserved', 'blocked']
  const types = ['all', 'IPv4', 'IPv6']

  const filteredIPs = ips.filter(ip => {
    const matchesSearch = ip.address.includes(searchTerm) ||
                         (ip.assigned_to?.server_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDatacenter = selectedDatacenter === 'all' || ip.datacenter === selectedDatacenter
    const matchesStatus = selectedStatus === 'all' || ip.status === selectedStatus
    const matchesType = selectedType === 'all' || ip.type === selectedType
    return matchesSearch && matchesDatacenter && matchesStatus && matchesType
  })

  const stats = {
    total: ips.length,
    active: ips.filter(ip => ip.status === 'active').length,
    available: ips.filter(ip => ip.status === 'available').length,
    reserved: ips.filter(ip => ip.status === 'reserved').length,
    blocked: ips.filter(ip => ip.status === 'blocked').length
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">IP Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage IPv4 and IPv6 addresses across all datacenters
            </p>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Allocate IPs
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">Total IPs</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl shadow-sm border border-green-200 dark:border-green-800 p-3">
            <p className="text-xs text-green-600 dark:text-green-400">Active</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-400">{stats.active}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 p-3">
            <p className="text-xs text-blue-600 dark:text-blue-400">Available</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{stats.available}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl shadow-sm border border-yellow-200 dark:border-yellow-800 p-3">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Reserved</p>
            <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{stats.reserved}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-3">
            <p className="text-xs text-red-600 dark:text-red-400">Blocked</p>
            <p className="text-xl font-bold text-red-700 dark:text-red-400">{stats.blocked}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by IP address or server name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedDatacenter}
                onChange={(e) => setSelectedDatacenter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {datacenters.map(dc => (
                  <option key={dc} value={dc}>
                    {dc === 'all' ? 'All Datacenters' : dc}
                  </option>
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

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {types.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Subnet Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={16} className="text-blue-500" />
              <span className="font-medium text-gray-900 dark:text-white">HOST02-YTA</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">103.127.42.0/24</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '65%' }} />
              </div>
              <span className="text-xs text-gray-500">6/10 used</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={16} className="text-blue-500" />
              <span className="font-medium text-gray-900 dark:text-white">HOST01-MUM</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">103.127.43.0/24</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '40%' }} />
              </div>
              <span className="text-xs text-gray-500">4/10 used</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={16} className="text-blue-500" />
              <span className="font-medium text-gray-900 dark:text-white">HOST03-BLR</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">103.127.44.0/24</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '20%' }} />
              </div>
              <span className="text-xs text-gray-500">2/10 used</span>
            </div>
          </div>
        </div>

        {/* IP List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">IP Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Assigned To</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Datacenter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bandwidth</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredIPs.map((ip) => {
                  const StatusIcon = statusConfig[ip.status].icon
                  return (
                    <tr key={ip.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-900 dark:text-white">{ip.address}</span>
                          <button
                            onClick={() => copyToClipboard(ip.address)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            <Copy size={12} className="text-gray-400" />
                          </button>
                        </div>
                        {ip.ptr_record && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ip.ptr_record}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-300">{ip.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                          statusConfig[ip.status].color
                        )}>
                          <StatusIcon size={12} />
                          {statusConfig[ip.status].label}
                        </span>
                        {ip.ddos_protection && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <Shield size={10} />
                            DDoS
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {ip.assigned_to ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {ip.assigned_to.server_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {ip.assigned_to.type === 'primary' ? 'Primary IP' : 'Additional IP'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-300">{ip.datacenter}</span>
                      </td>
                      <td className="px-4 py-3">
                        {ip.bandwidth_usage ? (
                          <div>
                            <div className="flex items-center gap-2 text-xs">
                              <ArrowDownRight size={12} className="text-green-500" />
                              <span className="text-gray-600 dark:text-gray-300">{ip.bandwidth_usage.in_mbps} Mbps</span>
                              <ArrowUpRight size={12} className="text-red-500 ml-2" />
                              <span className="text-gray-600 dark:text-gray-300">{ip.bandwidth_usage.out_mbps} Mbps</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
                              <div 
                                className="bg-blue-500 h-1 rounded-full"
                                style={{ width: `${(ip.bandwidth_usage.total_gb / (ip.bandwidth_usage.limit_gb || 100)) * 100}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Server size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredIPs.length === 0 && (
          <div className="text-center py-12">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No IP addresses found</p>
          </div>
        )}
      </div>
    </LayoutWrapper>
  )
}