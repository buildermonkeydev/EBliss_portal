// app/components/tickets/TicketTable.tsx
'use client'

import { 
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Calendar
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { Ticket } from '../../lib/ticket-api'

interface TicketTableProps {
  tickets: Ticket[]
  loading?: boolean
  onViewTicket: (ticket: Ticket) => void
}

export function TicketTable({ tickets, loading, onViewTicket }: TicketTableProps) {
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-blue-100 text-blue-700 border-blue-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      urgent: 'bg-red-100 text-red-700 border-red-200',
    }
    return colors[priority] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      open: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertCircle, label: 'Open' },
      in_progress: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock, label: 'In Progress' },
      resolved: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Resolved' },
      closed: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle, label: 'Closed' },
    }
    return configs[status] || configs.open
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="h-4 w-8 bg-gray-200 rounded"></div>
              <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              <div className="w-32 h-4 bg-gray-200 rounded"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 text-lg">No tickets found</p>
        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tickets.map((ticket) => {
            const statusConfig = getStatusConfig(ticket.status)
            const StatusIcon = statusConfig.icon
            
            return (
              <tr 
                key={ticket.id} 
                className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                onClick={() => onViewTicket(ticket)}
              >
                <td className="px-4 py-4">
                  <span className="text-sm font-mono text-gray-500">#{ticket.ticket_number || ticket.id}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="max-w-xs">
                    <p className="font-medium text-gray-900 truncate">{ticket.subject}</p>
                    {ticket.sla_breached && (
                      <Badge variant="destructive" className="mt-1 text-xs">SLA Breached</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-3 w-3 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ticket.user_name}</p>
                      <p className="text-xs text-gray-500">{ticket.user_email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <Badge className={`${getPriorityColor(ticket.priority)} border`}>
                    {ticket.priority}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <Badge className={`${statusConfig.color} border gap-1`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-600">{ticket.department}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {formatDate(ticket.created_at)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {ticket.assigned_to_name ? (
                    <span className="text-sm text-gray-600">{ticket.assigned_to_name}</span>
                  ) : (
                    <Badge variant="outline" className="text-xs">Unassigned</Badge>
                  )}
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); onViewTicket(ticket) }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}