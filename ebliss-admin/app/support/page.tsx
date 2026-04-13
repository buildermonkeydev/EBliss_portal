// app/support/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Search,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { LayoutWrapper } from '../components/layout/LayoutWrapper'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { useToast } from '../../hooks/use-toast'
import { ticketApi, Ticket, TicketStats } from '../lib/ticket-api'
import { TicketStatsCards } from '../components/tickets/TicketStatsCards'
import { TicketTable } from '../components/tickets/TicketTable'
import { TicketDetailView } from '../components/tickets/TicketDetailView'

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<TicketStats>({
    total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0,
    urgent: 0, high: 0, medium: 0, low: 0,
    assigned_to_me: 0, unassigned: 0, sla_breached: 0,
    avg_first_response_time: null, avg_resolution_time: null,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [viewTicket, setViewTicket] = useState(false)
  
  const { toast } = useToast()

  useEffect(() => {
    fetchTickets()
    fetchStats()
  }, [currentPage, statusFilter, priorityFilter])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const response = await ticketApi.getAllTickets({
        page: currentPage,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        search: search || undefined,
      })
      setTickets(response.data)
      setTotalPages(response.totalPages)
    } catch (error: any) {
      console.error('Failed to fetch tickets:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch tickets',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const data = await ticketApi.getStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket)
    setViewTicket(true)
  }

  const handleBack = () => {
    setViewTicket(false)
    setSelectedTicket(null)
  }

  const handleRefresh = () => {
    fetchTickets()
    fetchStats()
  }

  if (viewTicket && selectedTicket) {
    return (
      <LayoutWrapper>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TicketDetailView 
            ticket={selectedTicket} 
            onBack={handleBack}
            onUpdate={handleRefresh}
          />
        </div>
      </LayoutWrapper>
    )
  }

  return (
    <LayoutWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-sm text-gray-500 mt-1">Manage customer support requests</p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <TicketStatsCards stats={stats} loading={loading} />

        {/* Search and Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by subject, customer name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchTickets()}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchTickets} disabled={loading}>
            Search
          </Button>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <TicketTable
            tickets={tickets}
            loading={loading}
            onViewTicket={handleViewTicket}
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50">
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </LayoutWrapper>
  )
}