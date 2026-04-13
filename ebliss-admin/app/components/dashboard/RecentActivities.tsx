'use client'

import { useEffect, useState } from 'react'
import { 
  UserPlus, 
  Server, 
  CreditCard, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react'

interface Activity {
  id: number
  type: 'user' | 'vm' | 'payment' | 'invoice' | 'alert'
  action: string
  user: string
  time: string
  status?: 'success' | 'pending' | 'error'
}

export function RecentActivities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const mockActivities: Activity[] = [
      { id: 1, type: 'user', action: 'New user registration', user: 'John Doe', time: '2 minutes ago', status: 'success' },
      { id: 2, type: 'vm', action: 'VM provisioned', user: 'Sarah Smith', time: '15 minutes ago', status: 'success' },
      { id: 3, type: 'payment', action: 'Payment received', user: 'Mike Johnson', time: '1 hour ago', status: 'success' },
      { id: 4, type: 'invoice', action: 'Invoice generated', user: 'Emma Wilson', time: '2 hours ago', status: 'success' },
      { id: 5, type: 'alert', action: 'Low balance alert', user: 'David Brown', time: '3 hours ago', status: 'pending' },
      { id: 6, type: 'vm', action: 'VM stopped', user: 'Lisa Anderson', time: '5 hours ago', status: 'success' },
      { id: 7, type: 'user', action: 'Account suspended', user: 'Robert Chen', time: '1 day ago', status: 'error' },
    ]
    setActivities(mockActivities)
    setLoading(false)
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case 'user': return <UserPlus className="h-4 w-4 text-gray-500" />
      case 'vm': return <Server className="h-4 w-4 text-gray-500" />
      case 'payment': return <CreditCard className="h-4 w-4 text-gray-500" />
      case 'invoice': return <FileText className="h-4 w-4 text-gray-500" />
      case 'alert': return <AlertCircle className="h-4 w-4 text-gray-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-3.5 w-3.5 text-green-500" />
      case 'pending': return <Clock className="h-3.5 w-3.5 text-yellow-500" />
      case 'error': return <AlertCircle className="h-3.5 w-3.5 text-red-500" />
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Recent Activities</h3>
        <button className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors group">
          View All
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {/* Activities List */}
      <div className="flex-1 overflow-y-auto max-h-[380px]">
        {activities.map((activity) => (
          <div 
            key={activity.id} 
            className="flex items-start gap-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors"
          >
            {/* Icon */}
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              {getIcon(activity.type)}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-sm font-medium text-gray-900">
                  {activity.action}
                </span>
                <span className="text-xs text-gray-400">
                  by {activity.user}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{activity.time}</span>
                {getStatusIcon(activity.status)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {activities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No recent activities</p>
        </div>
      )}
    </div>
  )
}