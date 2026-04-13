// app/components/wallet/WalletStatsCards.tsx
'use client'

import { Wallet, TrendingUp, TrendingDown, Users, CreditCard } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { WalletStats } from '../../lib/wallet-api'

interface WalletStatsCardsProps {
  stats: WalletStats
  loading?: boolean
}

interface StatCard {
  label: string
  value: string
  subtext: string
  subtextColor?: string
  icon: typeof Wallet
  color: string
}

export function WalletStatsCards({ stats, loading }: WalletStatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const statCards: StatCard[] = [
    {
      label: 'Total Balance',
      value: formatCurrency(stats.total_balance),
      subtext: 'Across all users',
      icon: Wallet,
      color: 'blue',
    },
    {
      label: 'Active Users',
      value: stats.active_users.toLocaleString(),
      subtext: 'With wallet balance',
      icon: Users,
      color: 'purple',
    },
    {
      label: 'Total Credits',
      value: formatCurrency(stats.total_credits),
      subtext: 'Lifetime deposits',
      icon: CreditCard,
      color: 'orange',
    },
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; iconBg: string; text: string }> = {
      blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', text: 'text-blue-600' },
      green: { bg: 'bg-green-50', iconBg: 'bg-green-100', text: 'text-green-600' },
      purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-100', text: 'text-purple-600' },
      orange: { bg: 'bg-orange-50', iconBg: 'bg-orange-100', text: 'text-orange-600' },
    }
    return colors[color] || colors.blue
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-gray-200 rounded-xl">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => {
        const colors = getColorClasses(stat.color)
        const Icon = stat.icon
        return (
          <Card key={index} className={`border border-gray-200 rounded-xl ${colors.bg}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.subtextColor || 'text-gray-400'}`}>
                    {stat.subtext}
                  </p>
                </div>
                <div className={`w-10 h-10 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 ${colors.text}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}