'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutWrapper } from '../components/layout/LayoutWrapper'
import { 
  Users, 
  Server, 
  FileText, 
  Activity,
  Plus,
  Eye,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  HardDrive,
  Cpu,
  Wifi
} from 'lucide-react'
import { cn } from '../lib/utils'

interface DashboardStats {
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
  servers: {
    total: number
    online: number
    offline: number
    maintenance: number
  }
}

interface Activity {
  id: string
  type: 'user' | 'vm' | 'invoice' | 'server' | 'security'
  action: string
  description: string
  user: string
  timestamp: string
  status?: 'success' | 'warning' | 'error'
  link?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState('')
  const [userName, setUserName] = useState('Admin')
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')

    const user = localStorage.getItem('user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        setUserName(userData.name || userData.full_name || userData.email?.split('@')[0] || 'Admin')
      } catch (e) {
        console.error('Failed to parse user data')
      }
    }

    // Mock data
    const mockStats: DashboardStats = {
      users: { total: 342, active: 289, suspended: 8, growth: 12 },
      vms: { total: 156, running: 98, stopped: 48, suspended: 10 },
      invoices: { total: 234, paid: 178, pending: 42, overdue: 14 },
      servers: { total: 45, online: 38, offline: 4, maintenance: 3 }
    }

    const mockActivities: Activity[] = [
      {
        id: '1',
        type: 'vm',
        action: 'VM Created',
        description: 'New VM "Web Server 01" deployed',
        user: 'John Smith',
        timestamp: '2026-04-10T09:15:22',
        status: 'success',
        link: '/vms'
      },
      {
        id: '2',
        type: 'user',
        action: 'User Registered',
        description: 'New user "Sarah Johnson" signed up',
        user: 'Sarah Johnson',
        timestamp: '2026-04-10T08:30:15',
        status: 'success',
        link: '/users'
      },
      {
        id: '3',
        type: 'invoice',
        action: 'Payment Received',
        description: 'Invoice #INV-2024-089 paid',
        user: 'TechCorp Solutions',
        timestamp: '2026-04-10T07:45:00',
        status: 'success',
        link: '/invoices'
      },
      {
        id: '4',
        type: 'server',
        action: 'Server Alert',
        description: 'High CPU usage on DELL-740-01',
        user: 'System',
        timestamp: '2026-04-10T06:20:33',
        status: 'warning',
        link: '/dedicated-servers/monitoring'
      },
      {
        id: '5',
        type: 'security',
        action: 'Failed Login',
        description: '3 failed login attempts',
        user: 'Unknown',
        timestamp: '2026-04-10T05:12:18',
        status: 'error',
        link: '/settings'
      },
      {
        id: '6',
        type: 'vm',
        action: 'VM Stopped',
        description: 'VM "Database 02" stopped',
        user: 'Michael Chen',
        timestamp: '2026-04-09T22:30:00',
        status: 'warning',
        link: '/vms'
      },
      {
        id: '7',
        type: 'invoice',
        action: 'Invoice Overdue',
        description: 'Invoice #INV-2024-076 is overdue',
        user: 'DataSphere Analytics',
        timestamp: '2026-04-09T18:15:00',
        status: 'error',
        link: '/invoices'
      },
      {
        id: '8',
        type: 'user',
        action: 'Role Updated',
        description: 'User "David Wilson" role changed to Admin',
        user: 'Admin',
        timestamp: '2026-04-09T14:20:00',
        status: 'success',
        link: '/users'
      }
    ]

    setStats(mockStats)
    setActivities(mockActivities)
    setLoading(false)
  }, [])

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'user': return Users
      case 'vm': return Server
      case 'invoice': return FileText
      case 'server': return HardDrive
      case 'security': return AlertCircle
      default: return Activity
    }
  }

  const getStatusIcon = (status?: Activity['status']) => {
    switch (status) {
      case 'success': return CheckCircle2
      case 'warning': return AlertCircle
      case 'error': return XCircle
      default: return Clock
    }
  }

  const getStatusColor = (status?: Activity['status']) => {
    switch (status) {
      case 'success': return 'text-green-500 bg-green-50 dark:bg-green-900/20'
      case 'warning': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'error': return 'text-red-500 bg-red-50 dark:bg-red-900/20'
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-800'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const quickActions = [
    { label: 'Add User', icon: Users, color: 'bg-blue-500', onClick: () => router.push('/users') },
    { label: 'Deploy VM', icon: Server, color: 'bg-purple-500', onClick: () => router.push('/vms') },
    { label: 'Create Invoice', icon: FileText, color: 'bg-green-500', onClick: () => router.push('/invoices') },
    { label: 'Add Server', icon: HardDrive, color: 'bg-orange-500', onClick: () => router.push('/dedicated-servers/list') },
  ]

  const statCards = stats ? [
    {
      title: 'Total Users',
      value: stats.users.total,
      icon: Users,
      color: 'bg-blue-500',
      growth: stats.users.growth,
      trend: 'up',
      link: '/users',
      subStats: [
        { label: 'Active', value: stats.users.active, color: 'text-green-600' },
        { label: 'Suspended', value: stats.users.suspended, color: 'text-red-600' }
      ]
    },
    {
      title: 'Virtual Machines',
      value: stats.vms.total,
      icon: Server,
      color: 'bg-purple-500',
      link: '/vms',
      subStats: [
        { label: 'Running', value: stats.vms.running, color: 'text-green-600' },
        { label: 'Stopped', value: stats.vms.stopped, color: 'text-gray-600' }
      ]
    },
    {
      title: 'Dedicated Servers',
      value: stats.servers.total,
      icon: HardDrive,
      color: 'bg-orange-500',
      link: '/dedicated-servers/list',
      subStats: [
        { label: 'Online', value: stats.servers.online, color: 'text-green-600' },
        { label: 'Offline', value: stats.servers.offline, color: 'text-red-600' }
      ]
    },
    {
      title: 'Total Invoices',
      value: stats.invoices.total,
      icon: FileText,
      color: 'bg-green-500',
      link: '/invoices',
      subStats: [
        { label: 'Paid', value: stats.invoices.paid, color: 'text-green-600' },
        { label: 'Pending', value: stats.invoices.pending, color: 'text-yellow-600' }
      ]
    }
  ] : []

  const filteredActivities = activities.filter(activity => {
    if (timeRange === 'today') {
      return new Date(activity.timestamp).toDateString() === new Date().toDateString()
    }
    if (timeRange === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(activity.timestamp) >= weekAgo
    }
    return true
  })

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {greeting}, <span className="text-blue-600 dark:text-blue-400">{userName}</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Here's what's happening with your infrastructure today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Last updated</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <div
                key={idx}
                onClick={() => router.push(stat.link)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.color)}>
                    <Icon size={20} className="text-white" />
                  </div>
                  {stat.growth !== undefined && (
                    <div className={cn(
                      "flex items-center gap-0.5 text-xs font-medium",
                      stat.trend === 'up' ? "text-green-600" : "text-red-600"
                    )}>
                      {stat.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {stat.growth}%
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</p>
                
                <div className="flex items-center gap-4 text-xs">
                  {stat.subStats.map((sub, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className={cn("font-medium", sub.color)}>{sub.value}</span>
                      <span className="text-gray-400">{sub.label}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    View details
                  </span>
                  <ArrowUpRight size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action, idx) => {
              const Icon = action.icon
              return (
                <button
                  key={idx}
                  onClick={action.onClick}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                >
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", action.color)}>
                    <Icon size={14} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
                  <Plus size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activities</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Latest actions across your infrastructure</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-0.5">
                {(['today', 'week', 'month'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                      timeRange === range
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => router.push('/activities')}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all
                <ChevronRight size={12} />
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredActivities.slice(0, 6).map((activity) => {
              const ActivityIcon = getActivityIcon(activity.type)
              const StatusIcon = getStatusIcon(activity.status)
              
              return (
                <div
                  key={activity.id}
                  onClick={() => activity.link && router.push(activity.link)}
                  className={cn(
                    "px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                    activity.link && "cursor-pointer"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      getStatusColor(activity.status)
                    )}>
                      <ActivityIcon size={16} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {activity.action}
                        </span>
                        <span className={cn(
                          "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs",
                          getStatusColor(activity.status)
                        )}>
                          <StatusIcon size={10} />
                          {activity.status || 'info'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{activity.user}</span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock size={10} />
                          {formatTime(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    {activity.link && (
                      <Eye size={16} className="text-gray-400 hover:text-blue-500 transition-colors" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {filteredActivities.length === 0 && (
            <div className="px-5 py-8 text-center">
              <Activity size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No activities found</p>
            </div>
          )}
        </div>
      </div>
    </LayoutWrapper>
  )
}