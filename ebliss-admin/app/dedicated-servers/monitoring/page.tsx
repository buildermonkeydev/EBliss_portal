'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Server,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw
} from 'lucide-react'
import { LayoutWrapper } from '../../components/layout/LayoutWrapper'
import { cn } from '../../../lib/utils'

interface ServerMetric {
  server_id: string
  server_name: string
  status: 'healthy' | 'warning' | 'critical'
  
  cpu_usage: number
  cpu_temperature: number
  
  ram_usage: number
  ram_total: number
  
  storage_usage: number
  storage_total: number
  
  network_in: number
  network_out: number
  network_bandwidth_used: number
  network_bandwidth_total: number
  
  uptime_days: number
  last_boot: string
  
  alerts: {
    id: string
    severity: 'low' | 'medium' | 'high'
    message: string
    timestamp: string
  }[]
}

const staticMetrics: ServerMetric[] = [
  {
    server_id: 'DS-001',
    server_name: 'DELL-740-01',
    status: 'healthy',
    cpu_usage: 45,
    cpu_temperature: 58,
    ram_usage: 78,
    ram_total: 128,
    storage_usage: 450,
    storage_total: 960,
    network_in: 125.5,
    network_out: 342.8,
    network_bandwidth_used: 45.2,
    network_bandwidth_total: 100,
    uptime_days: 45,
    last_boot: '2026-02-20 03:15:22',
    alerts: []
  },
  {
    server_id: 'DS-002',
    server_name: 'HP-DL380-03',
    status: 'warning',
    cpu_usage: 78,
    cpu_temperature: 72,
    ram_usage: 210,
    ram_total: 256,
    storage_usage: 1520,
    storage_total: 1920,
    network_in: 458.2,
    network_out: 892.5,
    network_bandwidth_used: 185.6,
    network_bandwidth_total: 250,
    uptime_days: 23,
    last_boot: '2026-03-12 10:45:00',
    alerts: [
      {
        id: 'ALT-001',
        severity: 'medium',
        message: 'High CPU usage sustained for 15 minutes',
        timestamp: '2026-04-10 14:23:00'
      },
      {
        id: 'ALT-002',
        severity: 'low',
        message: 'Storage usage above 75%',
        timestamp: '2026-04-09 22:15:00'
      }
    ]
  },
  {
    server_id: 'DS-003',
    server_name: 'SM-2029TP-02',
    status: 'critical',
    cpu_usage: 92,
    cpu_temperature: 85,
    ram_usage: 480,
    ram_total: 512,
    storage_usage: 3250,
    storage_total: 3840,
    network_in: 892.4,
    network_out: 1256.8,
    network_bandwidth_used: 425.3,
    network_bandwidth_total: 500,
    uptime_days: 128,
    last_boot: '2025-12-04 08:00:00',
    alerts: [
      {
        id: 'ALT-003',
        severity: 'high',
        message: 'Critical CPU temperature detected',
        timestamp: '2026-04-10 15:30:00'
      },
      {
        id: 'ALT-004',
        severity: 'high',
        message: 'RAM usage critical - 94% utilized',
        timestamp: '2026-04-10 16:00:00'
      },
      {
        id: 'ALT-005',
        severity: 'medium',
        message: 'High network latency detected',
        timestamp: '2026-04-10 14:45:00'
      }
    ]
  },
  {
    server_id: 'DS-006',
    server_name: 'LEN-SR650-01',
    status: 'healthy',
    cpu_usage: 35,
    cpu_temperature: 52,
    ram_usage: 220,
    ram_total: 384,
    storage_usage: 2100,
    storage_total: 7680,
    network_in: 256.3,
    network_out: 567.2,
    network_bandwidth_used: 112.8,
    network_bandwidth_total: 300,
    uptime_days: 67,
    last_boot: '2026-02-03 11:20:00',
    alerts: []
  }
]

const statusConfig = {
  healthy: { color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', icon: CheckCircle2, label: 'Healthy' },
  warning: { color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', icon: AlertTriangle, label: 'Warning' },
  critical: { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', icon: AlertTriangle, label: 'Critical' }
}

const severityConfig = {
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

export default function ServerMonitoringPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<ServerMetric[]>(staticMetrics)
  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const overallStatus = {
    healthy: metrics.filter(m => m.status === 'healthy').length,
    warning: metrics.filter(m => m.status === 'warning').length,
    critical: metrics.filter(m => m.status === 'critical').length
  }

  const averageMetrics = {
    cpu: Math.round(metrics.reduce((sum, m) => sum + m.cpu_usage, 0) / metrics.length),
    ram: Math.round(metrics.reduce((sum, m) => sum + (m.ram_usage / m.ram_total) * 100, 0) / metrics.length),
    storage: Math.round(metrics.reduce((sum, m) => sum + (m.storage_usage / m.storage_total) * 100, 0) / metrics.length),
    bandwidth: Math.round(metrics.reduce((sum, m) => sum + (m.network_bandwidth_used / m.network_bandwidth_total) * 100, 0) / metrics.length)
  }

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Server Monitoring</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Real-time monitoring and alerts for dedicated servers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm flex items-center gap-2",
                autoRefresh 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
              )}
            >
              <RefreshCw size={16} className={cn(autoRefresh && "animate-spin")} />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Overall Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">Servers Online</p>
              <CheckCircle2 size={20} className="text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {overallStatus.healthy}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">Warnings</p>
              <AlertTriangle size={20} className="text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {overallStatus.warning}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">Critical</p>
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {overallStatus.critical}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Alerts</p>
              <Activity size={20} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {metrics.reduce((sum, m) => sum + m.alerts.length, 0)}
            </p>
          </div>
        </div>

        {/* Average Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cpu size={16} className="text-blue-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Avg CPU</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{averageMetrics.cpu}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className={cn(
                  "h-2 rounded-full",
                  averageMetrics.cpu > 80 ? "bg-red-500" : averageMetrics.cpu > 60 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${averageMetrics.cpu}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Server size={16} className="text-purple-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Avg RAM</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{averageMetrics.ram}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className={cn(
                  "h-2 rounded-full",
                  averageMetrics.ram > 80 ? "bg-red-500" : averageMetrics.ram > 60 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${averageMetrics.ram}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive size={16} className="text-orange-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Avg Storage</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{averageMetrics.storage}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className={cn(
                  "h-2 rounded-full",
                  averageMetrics.storage > 80 ? "bg-red-500" : averageMetrics.storage > 60 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${averageMetrics.storage}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wifi size={16} className="text-cyan-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Avg Bandwidth</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{averageMetrics.bandwidth}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className={cn(
                  "h-2 rounded-full",
                  averageMetrics.bandwidth > 80 ? "bg-red-500" : averageMetrics.bandwidth > 60 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${averageMetrics.bandwidth}%` }}
              />
            </div>
          </div>
        </div>

        {/* Server Metrics List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Server Health</h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {metrics.map((metric) => {
              const StatusIcon = statusConfig[metric.status].icon
              return (
                <div key={metric.server_id}>
                  <div 
                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => setSelectedServer(selectedServer === metric.server_id ? null : metric.server_id)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          statusConfig[metric.status].bg
                        )}>
                          <StatusIcon size={20} className={statusConfig[metric.status].color} />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{metric.server_name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">ID: {metric.server_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Uptime</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{metric.uptime_days} days</p>
                        </div>
                        {metric.alerts.length > 0 && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                            {metric.alerts.length} Alert{metric.alerts.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metrics Bars */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">CPU</span>
                          <span className="text-gray-700 dark:text-gray-300">{metric.cpu_usage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className={cn(
                              "h-1.5 rounded-full",
                              metric.cpu_usage > 80 ? "bg-red-500" : metric.cpu_usage > 60 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${metric.cpu_usage}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">RAM</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {Math.round((metric.ram_usage / metric.ram_total) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className={cn(
                              "h-1.5 rounded-full",
                              (metric.ram_usage / metric.ram_total) * 100 > 80 ? "bg-red-500" : 
                              (metric.ram_usage / metric.ram_total) * 100 > 60 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${(metric.ram_usage / metric.ram_total) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Storage</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {Math.round((metric.storage_usage / metric.storage_total) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className={cn(
                              "h-1.5 rounded-full",
                              (metric.storage_usage / metric.storage_total) * 100 > 80 ? "bg-red-500" : 
                              (metric.storage_usage / metric.storage_total) * 100 > 60 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${(metric.storage_usage / metric.storage_total) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Bandwidth</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {Math.round((metric.network_bandwidth_used / metric.network_bandwidth_total) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className={cn(
                              "h-1.5 rounded-full",
                              (metric.network_bandwidth_used / metric.network_bandwidth_total) * 100 > 80 ? "bg-red-500" : 
                              (metric.network_bandwidth_used / metric.network_bandwidth_total) * 100 > 60 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${(metric.network_bandwidth_used / metric.network_bandwidth_total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Alerts */}
                  {selectedServer === metric.server_id && metric.alerts.length > 0 && (
                    <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <h4 className="font-medium text-gray-900 dark:text-white mt-4 mb-3">Active Alerts</h4>
                      <div className="space-y-2">
                        {metric.alerts.map((alert) => (
                          <div key={alert.id} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              severityConfig[alert.severity]
                            )}>
                              {alert.severity.toUpperCase()}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm text-gray-900 dark:text-white">{alert.message}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <Clock size={12} className="inline mr-1" />
                                {alert.timestamp}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </LayoutWrapper>
  )
}