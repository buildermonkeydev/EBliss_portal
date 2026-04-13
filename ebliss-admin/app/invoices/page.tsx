// app/admin/invoices/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Plus,
  RefreshCw,
  Download,
  FileText , X
} from 'lucide-react'
import { LayoutWrapper } from '../components/layout/LayoutWrapper'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { useToast } from '../../hooks/use-toast'
import { invoiceApi, Invoice, InvoiceStats, User } from '../lib/invoice-api'
import { InvoiceStatsCards } from '../components/invoices/InvoiceStatsCards'
import { InvoicesTable } from '../components/invoices/InvoicesTable'
import { InvoiceDetailView } from '../components/invoices/InvoiceDetailView'

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [stats, setStats] = useState<InvoiceStats>({
    total: 0, paid: 0, pending: 0, overdue: 0, draft: 0, voided: 0,
    totalRevenue: 0, outstanding: 0, monthlyRevenue: 0, taxCollected: 0,
  })
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Dialogs
  const [viewDialog, setViewDialog] = useState(false)
  const [createDialog, setCreateDialog] = useState(false)
  const [voidDialog, setVoidDialog] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [voidReason, setVoidReason] = useState('')
  
  // Create invoice form
  const [newInvoice, setNewInvoice] = useState({
    user_id: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
    tax_rate: 0,
    due_date: '',
  })
  
  const { toast } = useToast()

  useEffect(() => {
    fetchInvoices()
    fetchStats()
    fetchUsers()
  }, [currentPage, statusFilter])

  const fetchInvoices = async () => {
    try {
      setLoading(true)
      const response = await invoiceApi.getAllInvoices({
        page: currentPage,
        limit: 20,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
      })
      setInvoices(response.data)
      setTotalPages(response.totalPages)
    } catch (error: any) {
      console.error('Failed to fetch invoices:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch invoices',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const data = await invoiceApi.getStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const data = await invoiceApi.getUsers()
      setUsers(data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
      setUsers([])
    }
  }

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setViewDialog(true)
  }

  const handleDownload = async (invoice: Invoice) => {
    try {
      const { pdf_url } = await invoiceApi.downloadPDF(invoice.id)
      window.open(pdf_url, '_blank')
      toast({
        title: 'Download Started',
        description: `${invoice.invoice_number}.pdf is being downloaded`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to download PDF',
        variant: 'destructive',
      })
    }
  }

  const handleSendReminder = async (invoice: Invoice) => {
    try {
      await invoiceApi.sendReminder(invoice.id)
      toast({
        title: 'Reminder Sent',
        description: `Payment reminder sent for ${invoice.invoice_number}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send reminder',
        variant: 'destructive',
      })
    }
  }

  const handleResend = async (invoice: Invoice) => {
    try {
      await invoiceApi.resendInvoice(invoice.id)
      toast({
        title: 'Invoice Resent',
        description: `${invoice.invoice_number} has been resent to ${invoice.user_email}`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to resend invoice',
        variant: 'destructive',
      })
    }
  }

  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      await invoiceApi.updateStatus(invoice.id, 'paid')
      toast({
        title: 'Invoice Marked as Paid',
        description: `${invoice.invoice_number} has been marked as paid`,
      })
      fetchInvoices()
      fetchStats()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  const handleVoid = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setVoidDialog(true)
  }

  const handleVoidConfirm = async () => {
    if (!selectedInvoice) return
    
    try {
      await invoiceApi.voidInvoice(selectedInvoice.id, voidReason)
      toast({
        title: 'Invoice Voided',
        description: `${selectedInvoice.invoice_number} has been voided`,
      })
      setVoidDialog(false)
      setVoidReason('')
      fetchInvoices()
      fetchStats()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to void invoice',
        variant: 'destructive',
      })
    }
  }

  const handleCreateInvoice = async () => {
    if (!newInvoice.user_id || newInvoice.items.length === 0) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' })
      return
    }
    
    try {
      await invoiceApi.createInvoice({
        user_id: parseInt(newInvoice.user_id),
        items: newInvoice.items.filter(i => i.description && i.quantity > 0),
        tax_rate: newInvoice.tax_rate,
        due_date: newInvoice.due_date || undefined,
      })
      toast({
        title: 'Invoice Created',
        description: 'New invoice created successfully',
      })
      setCreateDialog(false)
      resetForm()
      fetchInvoices()
      fetchStats()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create invoice',
        variant: 'destructive',
      })
    }
  }

  const handleGenerateMonthly = async () => {
    try {
      const result = await invoiceApi.generateAllMonthlyInvoices()
      toast({
        title: 'Monthly Invoices Generated',
        description: `${result.generated} invoices generated, ${result.failed} failed`,
      })
      fetchInvoices()
      fetchStats()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to generate monthly invoices',
        variant: 'destructive',
      })
    }
  }

  const resetForm = () => {
    setNewInvoice({
      user_id: '',
      items: [{ description: '', quantity: 1, unit_price: 0 }],
      tax_rate: 0,
      due_date: '',
    })
  }

  const calculateTotal = () => {
    const subtotal = newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    const tax = (subtotal * newInvoice.tax_rate) / 100
    return { subtotal, tax, total: subtotal + tax }
  }

  const totals = calculateTotal()

  return (
    <LayoutWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500 mt-1">Manage billing and invoices</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGenerateMonthly}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Monthly
            </Button>
            <Button onClick={() => setCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <InvoiceStatsCards stats={stats} loading={loading} />

        {/* Search and Filter */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by invoice number, customer name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchInvoices()}
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
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="voided">Voided</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchInvoices} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <InvoicesTable
            invoices={invoices}
            loading={loading}
            onView={handleView}
            onDownload={handleDownload}
            onSendReminder={handleSendReminder}
            onResend={handleResend}
            onMarkPaid={handleMarkPaid}
            onVoid={handleVoid}
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50">
              <p className="text-sm text-gray-600">Page {currentPage} of {totalPages}</p>
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

      {/* View Invoice Dialog */}
      <InvoiceDetailView
        open={viewDialog}
        onOpenChange={setViewDialog}
        invoice={selectedInvoice}
        onDownload={handleDownload}
        onMarkPaid={handleMarkPaid}
        onRefresh={() => {
          fetchInvoices()
          fetchStats()
        }}
      />

      {/* Create Invoice Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>Generate a new invoice for a customer</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Select Customer *</Label>
              <Select value={newInvoice.user_id} onValueChange={(v) => setNewInvoice({ ...newInvoice, user_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a customer" />
                </SelectTrigger>
                <SelectContent className="z-[10001]">
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.full_name || user.email} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <Input 
                  type="date" 
                  value={newInvoice.due_date} 
                  onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })} 
                />
              </div>
              <div>
                <Label>Tax Rate (%)</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={newInvoice.tax_rate} 
                  onChange={(e) => setNewInvoice({ ...newInvoice, tax_rate: parseFloat(e.target.value) || 0 })} 
                />
              </div>
            </div>
            
            <div>
              <Label>Invoice Items</Label>
              <div className="space-y-2">
                {newInvoice.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input 
                      placeholder="Description" 
                      className="flex-1" 
                      value={item.description} 
                      onChange={(e) => {
                        const items = [...newInvoice.items]
                        items[idx].description = e.target.value
                        setNewInvoice({ ...newInvoice, items })
                      }} 
                    />
                    <Input 
                      type="number" 
                      placeholder="Qty" 
                      className="w-20" 
                      value={item.quantity} 
                      onChange={(e) => {
                        const items = [...newInvoice.items]
                        items[idx].quantity = parseInt(e.target.value) || 1
                        setNewInvoice({ ...newInvoice, items })
                      }} 
                    />
                    <Input 
                      type="number" 
                      placeholder="Price" 
                      className="w-28" 
                      value={item.unit_price} 
                      onChange={(e) => {
                        const items = [...newInvoice.items]
                        items[idx].unit_price = parseFloat(e.target.value) || 0
                        setNewInvoice({ ...newInvoice, items })
                      }} 
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        const items = newInvoice.items.filter((_, i) => i !== idx)
                        setNewInvoice({ ...newInvoice, items: items.length ? items : [{ description: '', quantity: 1, unit_price: 0 }] })
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => setNewInvoice({ 
                  ...newInvoice, 
                  items: [...newInvoice.items, { description: '', quantity: 1, unit_price: 0 }] 
                })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Tax ({newInvoice.tax_rate}%):</span>
                <span>${totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base mt-2 pt-2 border-t">
                <span>Total:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateInvoice} className="bg-blue-600 hover:bg-blue-700">Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Invoice Dialog */}
      <Dialog open={voidDialog} onOpenChange={setVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to void {selectedInvoice?.invoice_number}?
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Reason (Optional)</Label>
            <Textarea 
              placeholder="Enter reason for voiding this invoice..." 
              value={voidReason} 
              onChange={(e) => setVoidReason(e.target.value)} 
              rows={3} 
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleVoidConfirm}>Void Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  )
}