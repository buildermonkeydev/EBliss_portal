'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Cpu,
  Server,
  HardDrive,
  Wifi,
  CheckCircle2,
  Globe,
  Shield,
  Zap
} from 'lucide-react'
import { LayoutWrapper } from '../../components/layout/LayoutWrapper'
import { cn } from '../../../lib/utils'

interface ServerConfiguration {
  id: string
  name: string
  category: 'entry' | 'performance' | 'enterprise' | 'gpu'
  
  cpu: {
    model: string
    cores: number
    threads: number
    base_clock: string
    boost_clock: string
  }
  
  ram_options: {
    size_gb: number
    type: string
    speed: string
    price_per_month: number
  }[]
  
  storage_options: {
    type: 'NVMe' | 'SSD' | 'HDD'
    size_gb: number
    raid_level: string
    price_per_month: number
  }[]
  
  network: {
    port_speed: string
    bandwidth_tb: number
    public_ips: number
  }
  
  base_price: number
  setup_fee: number
  datacenter_availability: string[]
  os_options: string[]
}

const staticConfigurations: ServerConfiguration[] = [
  {
    id: 'CFG-001',
    name: 'Entry-Level Server',
    category: 'entry',
    cpu: {
      model: 'Intel Xeon E-2388G',
      cores: 8,
      threads: 16,
      base_clock: '3.2 GHz',
      boost_clock: '5.1 GHz'
    },
    ram_options: [
      { size_gb: 16, type: 'DDR4', speed: '3200 MHz', price_per_month: 0 },
      { size_gb: 32, type: 'DDR4', speed: '3200 MHz', price_per_month: 2000 },
      { size_gb: 64, type: 'DDR4', speed: '3200 MHz', price_per_month: 5000 }
    ],
    storage_options: [
      { type: 'NVMe', size_gb: 512, raid_level: 'RAID 1', price_per_month: 0 },
      { type: 'NVMe', size_gb: 1024, raid_level: 'RAID 1', price_per_month: 1500 },
      { type: 'SSD', size_gb: 2000, raid_level: 'RAID 1', price_per_month: 3000 }
    ],
    network: {
      port_speed: '1 Gbps',
      bandwidth_tb: 10,
      public_ips: 2
    },
    base_price: 8999,
    setup_fee: 0,
    datacenter_availability: ['HOST01-MUM', 'HOST02-YTA'],
    os_options: ['Ubuntu 22.04', 'CentOS 9', 'Windows Server 2022']
  },
  {
    id: 'CFG-002',
    name: 'Performance Server',
    category: 'performance',
    cpu: {
      model: 'AMD EPYC 7543',
      cores: 32,
      threads: 64,
      base_clock: '2.8 GHz',
      boost_clock: '3.7 GHz'
    },
    ram_options: [
      { size_gb: 64, type: 'DDR4', speed: '3200 MHz', price_per_month: 0 },
      { size_gb: 128, type: 'DDR4', speed: '3200 MHz', price_per_month: 8000 },
      { size_gb: 256, type: 'DDR4', speed: '3200 MHz', price_per_month: 18000 }
    ],
    storage_options: [
      { type: 'NVMe', size_gb: 1920, raid_level: 'RAID 10', price_per_month: 0 },
      { type: 'NVMe', size_gb: 3840, raid_level: 'RAID 10', price_per_month: 5000 },
      { type: 'NVMe', size_gb: 7680, raid_level: 'RAID 10', price_per_month: 12000 }
    ],
    network: {
      port_speed: '10 Gbps',
      bandwidth_tb: 50,
      public_ips: 5
    },
    base_price: 24999,
    setup_fee: 0,
    datacenter_availability: ['HOST01-MUM', 'HOST02-YTA', 'HOST03-BLR'],
    os_options: ['Ubuntu 22.04', 'CentOS 9', 'Debian 12', 'AlmaLinux 9']
  },
  {
    id: 'CFG-003',
    name: 'Enterprise Server',
    category: 'enterprise',
    cpu: {
      model: 'Intel Xeon Platinum 8380',
      cores: 40,
      threads: 80,
      base_clock: '2.3 GHz',
      boost_clock: '3.4 GHz'
    },
    ram_options: [
      { size_gb: 256, type: 'DDR4', speed: '3200 MHz', price_per_month: 0 },
      { size_gb: 512, type: 'DDR4', speed: '3200 MHz', price_per_month: 25000 },
      { size_gb: 1024, type: 'DDR4', speed: '3200 MHz', price_per_month: 55000 }
    ],
    storage_options: [
      { type: 'NVMe', size_gb: 3840, raid_level: 'RAID 10', price_per_month: 0 },
      { type: 'NVMe', size_gb: 7680, raid_level: 'RAID 10', price_per_month: 15000 },
      { type: 'NVMe', size_gb: 15360, raid_level: 'RAID 10', price_per_month: 35000 }
    ],
    network: {
      port_speed: '25 Gbps',
      bandwidth_tb: 100,
      public_ips: 8
    },
    base_price: 54999,
    setup_fee: 5000,
    datacenter_availability: ['HOST01-MUM', 'HOST02-YTA', 'HOST03-BLR'],
    os_options: ['Ubuntu 22.04', 'CentOS 9', 'Debian 12', 'VMware ESXi 8', 'Proxmox VE']
  },
  {
    id: 'CFG-004',
    name: 'GPU Compute Server',
    category: 'gpu',
    cpu: {
      model: 'AMD EPYC 9654',
      cores: 96,
      threads: 192,
      base_clock: '2.4 GHz',
      boost_clock: '3.7 GHz'
    },
    ram_options: [
      { size_gb: 512, type: 'DDR5', speed: '4800 MHz', price_per_month: 0 },
      { size_gb: 768, type: 'DDR5', speed: '4800 MHz', price_per_month: 40000 },
      { size_gb: 1536, type: 'DDR5', speed: '4800 MHz', price_per_month: 90000 }
    ],
    storage_options: [
      { type: 'NVMe', size_gb: 7680, raid_level: 'RAID 10', price_per_month: 0 },
      { type: 'NVMe', size_gb: 15360, raid_level: 'RAID 10', price_per_month: 25000 }
    ],
    network: {
      port_speed: '100 Gbps',
      bandwidth_tb: 250,
      public_ips: 16
    },
    base_price: 149999,
    setup_fee: 10000,
    datacenter_availability: ['HOST02-YTA'],
    os_options: ['Ubuntu 24.04', 'NVIDIA AI Enterprise', 'VMware ESXi 8']
  }
]

const categoryConfig = {
  entry: { label: 'Entry Level', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  performance: { label: 'Performance', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  enterprise: { label: 'Enterprise', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  gpu: { label: 'GPU Compute', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' }
}

export default function ServerConfigurationsPage() {
  const router = useRouter()
  const [configurations, setConfigurations] = useState<ServerConfiguration[]>(staticConfigurations)
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this configuration?')) {
      setConfigurations(configurations.filter(c => c.id !== id))
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Server Configurations</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage pre-defined dedicated server configurations
            </p>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            New Configuration
          </button>
        </div>

        {/* Configurations List */}
        <div className="space-y-4">
          {configurations.map((config) => (
            <div
              key={config.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Config Header */}
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => setExpandedConfig(expandedConfig === config.id ? null : config.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Server className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {config.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          categoryConfig[config.category].color
                        )}>
                          {categoryConfig[config.category].label}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Base Price: ₹{config.base_price.toLocaleString()}/mo
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                      <Save size={16} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(config.id)
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Quick Specs */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">CPU</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {config.cpu.model}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">RAM Options</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {config.ram_options[0].size_gb}GB - {config.ram_options[config.ram_options.length - 1].size_gb}GB
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Storage Options</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Up to {config.storage_options[config.storage_options.length - 1].size_gb}GB {config.storage_options[0].type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Datacenters</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {config.datacenter_availability.length} locations
                    </p>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedConfig === config.id && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900/50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CPU Details */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Cpu size={18} /> Processor
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">Model:</span> {config.cpu.model}</p>
                        <p><span className="text-gray-500">Cores/Threads:</span> {config.cpu.cores}C/{config.cpu.threads}T</p>
                        <p><span className="text-gray-500">Base Clock:</span> {config.cpu.base_clock}</p>
                        <p><span className="text-gray-500">Boost Clock:</span> {config.cpu.boost_clock}</p>
                      </div>
                    </div>

                    {/* RAM Options */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Server size={18} /> Memory Options
                      </h4>
                      <div className="space-y-2">
                        {config.ram_options.map((ram, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-900 dark:text-white">
                              {ram.size_gb}GB {ram.type} {ram.speed}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {ram.price_per_month === 0 ? 'Included' : `+₹${ram.price_per_month}/mo`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Storage Options */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <HardDrive size={18} /> Storage Options
                      </h4>
                      <div className="space-y-2">
                        {config.storage_options.map((storage, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm p-2 bg-white dark:bg-gray-800 rounded-lg">
                            <span className="text-gray-900 dark:text-white">
                              {storage.size_gb}GB {storage.type} ({storage.raid_level})
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {storage.price_per_month === 0 ? 'Included' : `+₹${storage.price_per_month}/mo`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Network & OS */}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Wifi size={18} /> Network & OS
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">Port Speed:</span> {config.network.port_speed}</p>
                        <p><span className="text-gray-500">Bandwidth:</span> {config.network.bandwidth_tb} TB/month</p>
                        <p><span className="text-gray-500">Public IPs:</span> {config.network.public_ips}</p>
                        <div className="mt-3">
                          <p className="text-gray-500 mb-1">Available OS:</p>
                          <div className="flex flex-wrap gap-1">
                            {config.os_options.map((os, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                                {os}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Datacenter Availability */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Globe size={18} /> Available Datacenters
                    </h4>
                    <div className="flex gap-2">
                      {config.datacenter_availability.map((dc, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm flex items-center gap-1">
                          <CheckCircle2 size={14} />
                          {dc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </LayoutWrapper>
  )
}