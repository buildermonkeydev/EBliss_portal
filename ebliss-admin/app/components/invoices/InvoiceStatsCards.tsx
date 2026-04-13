// app/components/invoices/InvoiceStatsCards.tsx
'use client'

import { FileText, CheckCircle, Clock, AlertCircle, DollarSign, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { InvoiceStats } from '../../lib/invoice-api'

interface InvoiceStatsCardsProps {
  stats: InvoiceStats | null
  loading?: boolean
}

export function InvoiceStatsCards({ stats, loading }: InvoiceStatsCardsProps) {
  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0.00'
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const safeStats: InvoiceStats = {
    total: stats?.total ?? 0,
    paid: stats?.paid ?? 0,
    pending: stats?.pending ?? 0,
    overdue: stats?.overdue ?? 0,
    draft: stats?.draft ?? 0,
    voided: stats?.voided ?? 0,
    totalRevenue: stats?.totalRevenue ?? 0,
    outstanding: stats?.outstanding ?? 0,
    monthlyRevenue: stats?.monthlyRevenue ?? 0,
    taxCollected: stats?.taxCollected ?? 0,
  }

  const statCards = [
    { label: 'Total Invoices', value: safeStats.total, icon: FileText, color: 'blue', isCurrency: false },
    { label: 'Paid', value: safeStats.paid, icon: CheckCircle, color: 'green', isCurrency: false },
    { label: 'Pending', value: safeStats.pending, icon: Clock, color: 'yellow', isCurrency: false },
    { label: 'Overdue', value: safeStats.overdue, icon: AlertCircle, color: 'red', isCurrency: false },
    { label: 'Total Revenue', value: safeStats.totalRevenue, icon: DollarSign, color: 'emerald', isCurrency: true },
    { label: 'Outstanding', value: safeStats.outstanding, icon: TrendingUp, color: 'orange', isCurrency: true },
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; iconBg: string; text: string }> = {
      blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', text: 'text-blue-600' },
      green: { bg: 'bg-green-50', iconBg: 'bg-green-100', text: 'text-green-600' },
      yellow: { bg: 'bg-yellow-50', iconBg: 'bg-yellow-100', text: 'text-yellow-600' },
      red: { bg: 'bg-red-50', iconBg: 'bg-red-100', text: 'text-red-600' },
      emerald: { bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', text: 'text-emerald-600' },
      orange: { bg: 'bg-orange-50', iconBg: 'bg-orange-100', text: 'text-orange-600' },
    }
    return colors[color] || colors.blue
  }

  const formatValue = (value: number | undefined | null, isCurrency: boolean): string => {
    const safeValue = value ?? 0
    if (isCurrency) {
      return formatCurrency(safeValue)
    }
    return safeValue.toLocaleString()
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="border border-gray-200">
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-12"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {statCards.map((stat, index) => {
        const colors = getColorClasses(stat.color)
        const Icon = stat.icon
        return (
          <Card key={index} className={`border border-gray-200 ${colors.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 ${colors.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${colors.text}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${colors.text}`}>
                {formatValue(stat.value, stat.isCurrency)}
              </p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}