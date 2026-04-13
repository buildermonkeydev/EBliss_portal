// lib/api/ticket-api.ts
import { api } from './api'

export interface Ticket {
  id: number
  ticket_number: string
  subject: string
  user_id: number
  user_email: string
  user_name: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  department: string
  description: string
  assigned_to: number | null
  assigned_to_name: string | null
  last_reply_at: string | null
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  first_response_at: string | null
  sla_breached: boolean
}

export interface TicketMessage {
  id: number
  ticket_id: number
  user_id: number | null
  admin_id: number | null
  author: string
  author_type: 'customer' | 'admin'
  message: string
  attachments: string[] | null
  is_internal: boolean
  created_at: string
}

export interface TicketStats {
  total: number
  open: number
  in_progress: number
  resolved: number
  closed: number
  urgent: number
  high: number
  medium: number
  low: number
  assigned_to_me: number
  unassigned: number
  sla_breached: number
  avg_first_response_time: number | null
  avg_resolution_time: number | null
}

export interface TicketsResponse {
  data: Ticket[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const ticketApi = {
  // Get all tickets (admin)
  async getAllTickets(params?: {
    page?: number
    limit?: number
    status?: string
    priority?: string
    department?: string
    assigned_to?: number
    search?: string
  }): Promise<TicketsResponse> {
    const response = await api.get('/tickets/admin/all', { params })
    return response.data
  },

  // Get ticket statistics (admin)
  async getStats(): Promise<TicketStats> {
    const response = await api.get('/tickets/admin/stats')
    return response.data.stats
  },

  // Get single ticket (admin)
  async getTicket(id: number): Promise<Ticket> {
    const response = await api.get(`/tickets/admin/${id}`)
    return response.data.ticket
  },

  // Reply to ticket (admin)
  async replyToTicket(id: number, message: string): Promise<TicketMessage> {
    const response = await api.post(`/tickets/admin/${id}/reply`, { message })
    return response.data.message
  },

  // Add internal note (admin)
  async addInternalNote(id: number, note: string): Promise<any> {
    const response = await api.post(`/tickets/admin/${id}/internal-note`, { note })
    return response.data.note
  },

  // Update ticket status (admin)
  async updateStatus(id: number, status: string, resolution?: string): Promise<Ticket> {
    const response = await api.put(`/tickets/admin/${id}/status`, { status, resolution })
    return response.data.ticket
  },

  // Assign ticket (admin)
  async assignTicket(id: number, assigned_to: number): Promise<Ticket> {
    const response = await api.post(`/tickets/admin/${id}/assign`, { assigned_to })
    return response.data.ticket
  },
}