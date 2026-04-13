// lib/api/invoice-api.ts
import { api } from './api'

export interface InvoiceItem {
  id: number
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Invoice {
  id: number
  invoice_number: string
  user_id: number
  user_email: string
  user_name: string
  company_name?: string
  tax_id?: string
  tax_rate: number
  subtotal: number
  tax_amount: number
  total: number
  status: 'paid' | 'pending' | 'overdue' | 'voided' | 'draft'
  due_date: string
  created_at: string
  paid_at?: string
  pdf_url?: string
  items: InvoiceItem[]
  billing_period_start?: string
  billing_period_end?: string
  items_json?: any // Raw items from API
}

export interface InvoiceStats {
  total: number
  paid: number
  pending: number
  overdue: number
  draft: number
  voided: number
  totalRevenue: number
  outstanding: number
  monthlyRevenue: number
  taxCollected: number
}

export interface User {
  id: number
  email: string
  full_name: string
  company?: string
  tax_id?: string
  tax_rate?: number
}

export const invoiceApi = {
  // Get all invoices (admin)
  async getAllInvoices(params?: {
    page?: number
    limit?: number
    status?: string
    user_id?: number
    search?: string
    from_date?: string
    to_date?: string
  }): Promise<{ data: Invoice[]; total: number; page: number; totalPages: number }> {
    const response = await api.get('/invoices', { params })
    
    // Transform the API response to match our interface
    const invoices = response.data.invoices || []
    const pagination = response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }
    
    const transformedInvoices = invoices.map((invoice: any) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      user_id: invoice.user_id,
      user_email: invoice.user?.email || '',
      user_name: invoice.user?.full_name || 'Unknown',
      company_name: invoice.items_json?.user_details?.company || '',
      tax_id: invoice.items_json?.user_details?.tax_id || '',
      tax_rate: invoice.tax_rate || 0,
      subtotal: invoice.subtotal || 0,
      tax_amount: invoice.tax_amount || 0,
      total: invoice.total || 0,
      status: invoice.status || 'pending',
      due_date: invoice.due_date,
      created_at: invoice.created_at,
      paid_at: invoice.paid_at,
      pdf_url: invoice.pdf_url,
      items: extractItems(invoice),
      billing_period_start: invoice.billing_period_start,
      billing_period_end: invoice.billing_period_end,
      items_json: invoice.items_json,
    }))
    
    return {
      data: transformedInvoices,
      total: pagination.total,
      page: pagination.page,
      totalPages: pagination.totalPages,
    }
  },

  // Get invoice statistics (admin)
  async getStats(params?: { from_date?: string; to_date?: string }): Promise<InvoiceStats> {
    try {
      const response = await api.get('/invoices/stats', { params })
      const summary = response.data.summary || {}
      
      // Calculate stats from the response
      const byStatus = summary.by_status || []
      const paidData = byStatus.find((s: any) => s.status === 'paid') || { count: 0, total: 0 }
      const pendingData = byStatus.find((s: any) => s.status === 'pending') || { count: 0, total: 0 }
      const overdueData = byStatus.find((s: any) => s.status === 'overdue') || { count: 0, total: 0 }
      const draftData = byStatus.find((s: any) => s.status === 'draft') || { count: 0, total: 0 }
      const voidedData = byStatus.find((s: any) => s.status === 'voided') || { count: 0, total: 0 }
      
      return {
        total: summary.total_invoices || 0,
        paid: paidData.count || 0,
        pending: pendingData.count || 0,
        overdue: overdueData.count || 0,
        draft: draftData.count || 0,
        voided: voidedData.count || 0,
        totalRevenue: paidData.total || 0,
        outstanding: pendingData.total + overdueData.total,
        monthlyRevenue: summary.total_amount || 0,
        taxCollected: 0, // Calculate if needed
      }
    } catch (error) {
      console.error('Failed to fetch invoice stats:', error)
      return {
        total: 0, paid: 0, pending: 0, overdue: 0, draft: 0, voided: 0,
        totalRevenue: 0, outstanding: 0, monthlyRevenue: 0, taxCollected: 0,
      }
    }
  },

  // Get single invoice
  async getInvoice(id: number): Promise<Invoice> {
    const response = await api.get(`/invoices/${id}`)
    const invoice = response.data
    
    return {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      user_id: invoice.user_id,
      user_email: invoice.user?.email || '',
      user_name: invoice.user?.full_name || 'Unknown',
      company_name: invoice.items_json?.user_details?.company || '',
      tax_id: invoice.items_json?.user_details?.tax_id || '',
      tax_rate: invoice.tax_rate || 0,
      subtotal: invoice.subtotal || 0,
      tax_amount: invoice.tax_amount || 0,
      total: invoice.total || 0,
      status: invoice.status || 'pending',
      due_date: invoice.due_date,
      created_at: invoice.created_at,
      paid_at: invoice.paid_at,
      pdf_url: invoice.pdf_url,
      items: extractItems(invoice),
      billing_period_start: invoice.billing_period_start,
      billing_period_end: invoice.billing_period_end,
      items_json: invoice.items_json,
    }
  },

  // Get users for invoice creation - FIX: Use correct endpoint
  async getUsers(): Promise<User[]> {
    try {
      // Use the correct admin endpoint
      const response = await api.get('/admin/users', { 
        params: { limit: 1000, page: 1 } 
      })
      
      // Handle different response structures
      const users = response.data.data || response.data || []
      
      return users.map((user: any) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name || user.email,
        company: user.company || '',
        tax_id: user.tax_id || '',
        tax_rate: user.tax_rate || 0,
      }))
    } catch (error) {
      console.error('Failed to fetch users:', error)
      return []
    }
  },

  // Download invoice PDF
  async downloadPDF(id: number): Promise<{ pdf_url: string }> {
    const response = await api.get(`/invoices/${id}/pdf`)
    return response.data
  },

  // Update invoice status (admin)
  async updateStatus(id: number, status: string): Promise<Invoice> {
    const response = await api.post(`/invoices/${id}/status`, { status })
    return response.data
  },

  // Void invoice (admin)
  async voidInvoice(id: number, reason: string): Promise<any> {
    const response = await api.post(`/invoices/${id}/void`, { reason })
    return response.data
  },

  // Resend invoice email (admin)
  async resendInvoice(id: number): Promise<any> {
    const response = await api.post(`/invoices/${id}/resend`)
    return response.data
  },

  // Send reminder (admin)
  async sendReminder(id: number): Promise<any> {
    const response = await api.post(`/invoices/${id}/remind`)
    return response.data
  },

  // Generate monthly invoice for user (admin)
  async generateMonthlyInvoice(userId: number, month?: string): Promise<Invoice> {
    const response = await api.post('/invoices/generate-monthly', { user_id: userId, month })
    return response.data
  },

  // Generate monthly invoices for all users (admin)
  async generateAllMonthlyInvoices(): Promise<{ generated: number; failed: number }> {
    const response = await api.post('/invoices/generate-all-monthly')
    return response.data
  },

  // Create custom invoice (admin)
  async createInvoice(data: {
    user_id: number
    items: Array<{ description: string; quantity: number; unit_price: number }>
    tax_rate?: number
    due_date?: string
  }): Promise<Invoice> {
    const response = await api.post('/invoices/admin/create', data)
    return response.data
  },
}

// Helper function to extract items from invoice
function extractItems(invoice: any): InvoiceItem[] {
  const items: InvoiceItem[] = []
  const itemsJson = invoice.items_json || {}
  
  // Extract transactions as items
  if (itemsJson.transactions && Array.isArray(itemsJson.transactions)) {
    itemsJson.transactions.forEach((tx: any, index: number) => {
      items.push({
        id: index + 1,
        description: tx.description || 'Payment',
        quantity: 1,
        unit_price: tx.amount || 0,
        total: tx.amount || 0,
      })
    })
  }
  
  // If no transactions, use subtotal as single item
  if (items.length === 0 && invoice.subtotal) {
    items.push({
      id: 1,
      description: 'Invoice Total',
      quantity: 1,
      unit_price: invoice.subtotal,
      total: invoice.subtotal,
    })
  }
  
  return items
}