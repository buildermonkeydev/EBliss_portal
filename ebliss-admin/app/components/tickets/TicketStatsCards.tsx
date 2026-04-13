// app/components/tickets/TicketStatsCards.tsx
'use client'

import { TicketStats } from '../../lib/ticket-api'

interface TicketStatsCardsProps {
  stats: TicketStats
  loading?: boolean
}

export function TicketStatsCards({ stats, loading }: TicketStatsCardsProps) {
  const statCards = [
    { label: 'Total Tickets', value: stats.total, color: 'gray' },
    { label: 'Open', value: stats.open, color: 'yellow' },
    { label: 'In Progress', value: stats.in_progress, color: 'blue' },
    { label: 'Resolved', value: stats.resolved, color: 'green' },
    { label: 'Urgent', value: stats.urgent, color: 'red' },
    { label: 'Unassigned', value: stats.unassigned, color: 'orange' },
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      gray: 'bg-gray-50 border-gray-200 text-gray-900',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      green: 'bg-green-50 border-green-200 text-green-700',
      red: 'bg-red-50 border-red-200 text-red-700',
      orange: 'bg-orange-50 border-orange-200 text-orange-700',
    }
    return colors[color] || colors.gray
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-8"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <div key={index} className={`rounded-xl border p-4 ${getColorClasses(stat.color)}`}>
          <p className="text-xs font-medium opacity-75 mb-1">{stat.label}</p>
          <p className="text-2xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  )
}