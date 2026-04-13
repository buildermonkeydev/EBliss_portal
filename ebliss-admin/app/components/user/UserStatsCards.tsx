// components/users/UserStatsCards.tsx
'use client'

interface UserStats {
  totalUsers: number
  activeUsers: number
  verifiedUsers: number
  totalBalance: number
  verificationRate: number
  pendingUsers?: number
  suspendedUsers?: number
  totalVMs?: number
}

interface UserStatsCardsProps {
  stats: UserStats
}

export function UserStatsCards({ stats }: UserStatsCardsProps) {
  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,

      color: 'blue'
    },
    {
      label: 'Active Users',
      value: stats.activeUsers,
      
      color: 'green'
    },
    {
      label: 'Suspended',
      value: stats.suspendedUsers || 0,
   
      color: 'red'
    },
   
   
    {
      label: 'Total VMs',
      value: stats.totalVMs || 0,
    
      color: 'purple'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
      red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' }
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {statCards.map((stat, index) => {
        const colors = getColorClasses(stat.color)
        return (
          <div 
            key={index} 
            className={`${colors.bg} rounded-xl border ${colors.border} p-4 hover:shadow-md transition-shadow`}
          >
           
            <p className={`text-2xl font-bold ${colors.text}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        )
      })}
    </div>
  )
}