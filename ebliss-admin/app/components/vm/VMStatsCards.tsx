// components/vm/VMStatsCards.tsx
'use client'

import { Server, Activity, Power, Circle, Cpu, HardDrive, DollarSign } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { VMStats } from './types'

interface VMStatsCardsProps {
  stats: VMStats
  loading?: boolean
}

export function VMStatsCards({ stats, loading }: VMStatsCardsProps) {
  const statCards = [
    {
      label: 'Total VMs',
      value: stats.totalVMs,
      icon: Server,
      color: 'blue',
    },
    {
      label: 'Running',
      value: stats.runningVMs,
      icon: Activity,
      color: 'green',
    },
    {
      label: 'Stopped',
      value: stats.stoppedVMs,
      icon: Power,
      color: 'gray',
    },
    {
      label: 'Suspended',
      value: stats.suspendedVMs,
      icon: Circle,
      color: 'yellow',
    },
    {
      label: 'Total vCPU',
      value: `${stats.totalVCPU} cores`,
      icon: Cpu,
      color: 'purple',
    },
    {
      label: 'Total RAM',
      value: `${stats.totalRAM} GB`,
      icon: HardDrive,
      color: 'indigo',
    },
    {
      label: 'Total Storage',
      value: `${stats.totalStorage} GB`,
      icon: HardDrive,
      color: 'orange',
    },
    
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; iconBg: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
      green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100' },
      gray: { bg: 'bg-gray-50', text: 'text-gray-600', iconBg: 'bg-gray-100' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', iconBg: 'bg-yellow-100' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', iconBg: 'bg-indigo-100' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
    }
    return colors[color] || colors.blue
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="border border-gray-200 rounded-xl">
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
      {statCards.map((stat, index) => {
        const colors = getColorClasses(stat.color)
        const Icon = stat.icon
        return (
          <Card key={index} className={`border border-gray-200 rounded-xl ${colors.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${colors.text}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${colors.text}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}