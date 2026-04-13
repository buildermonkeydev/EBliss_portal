'use client'

import { Users, Server, FileText, DollarSign, TrendingUp, CreditCard, Activity, Zap } from 'lucide-react'
import { Card, CardContent } from '../ui/card'

interface StatsCardsProps {
  stats: {
    users: {
      total: number
      active: number
      suspended: number
      growth: number
    }
    vms: {
      total: number
      running: number
      stopped: number
      suspended: number
    }
    invoices: {
      total: number
      paid: number
      pending: number
      overdue: number
    }
    revenue: {
      monthly: any[]
      total: number
      growth: number
    }
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) return null

  const cards = [
    {
      title: 'Total Users',
      value: stats.users.total,
      change: `+${stats.users.growth}%`,
      icon: Users,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-600'
    },
    {
      title: 'Active Users',
      value: stats.users.active,
      subtitle: `${stats.users.suspended} suspended`,
      icon: Activity,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      valueColor: 'text-green-600'
    },
    {
      title: 'Running VMs',
      value: stats.vms.running,
      subtitle: `${stats.vms.stopped} stopped`,
      icon: Server,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-600'
    },
    {
      title: 'Total VMs',
      value: stats.vms.total,
      subtitle: `${stats.vms.running} running`,
      icon: Zap,
      iconBg: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      valueColor: 'text-yellow-600'
    },
    {
      title: 'Paid Invoices',
      value: stats.invoices.paid,
      subtitle: `${stats.invoices.total} total`,
      icon: FileText,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-600'
    },
    {
      title: 'Pending Invoices',
      value: stats.invoices.pending,
      subtitle: `${stats.invoices.overdue} overdue`,
      icon: CreditCard,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-600'
    },
    {
      title: 'Total Revenue',
      value: `$${stats.revenue.total.toLocaleString()}`,
      change: `+${stats.revenue.growth}%`,
      icon: DollarSign,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      valueColor: 'text-teal-600'
    },
    {
      title: 'Monthly Revenue',
      value: `$${(stats.revenue.monthly?.[stats.revenue.monthly?.length - 1]?.revenue || 0).toLocaleString()}`,
      subtitle: 'Current month',
      icon: TrendingUp,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      valueColor: 'text-indigo-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card 
          key={index} 
          className="border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 hover:border-blue-200"
          style={{ animation: `fadeUp 0.4s ease both ${index * 0.05}s` }}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  {card.title}
                </p>
                <p className={`text-2xl font-bold ${card.valueColor}`}>
                  {card.value}
                </p>
                {card.change && (
                  <p className="text-xs text-green-600 mt-1">
                    {card.change} vs last month
                  </p>
                )}
                {card.subtitle && (
                  <p className="text-xs text-gray-400 mt-1">
                    {card.subtitle}
                  </p>
                )}
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}