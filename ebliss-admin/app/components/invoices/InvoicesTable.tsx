// app/components/invoices/InvoicesTable.tsx
'use client'

import { 
  MoreVertical, 
  Download, 
  Send, 
  Eye, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Clock,
  AlertCircle,
  FileText
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Invoice } from '../../lib/invoice-api'

interface InvoicesTableProps {
  invoices: Invoice[]
  loading?: boolean
  onView: (invoice: Invoice) => void
  onDownload: (invoice: Invoice) => void
  onSendReminder: (invoice: Invoice) => void
  onResend: (invoice: Invoice) => void
  onMarkPaid: (invoice: Invoice) => void
  onVoid: (invoice: Invoice) => void
}

export function InvoicesTable({ 
  invoices = [], // Add default empty array
  loading, 
  onView, 
  onDownload, 
  onSendReminder,
  onResend,
  onMarkPaid, 
  onVoid 
}: InvoicesTableProps) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      paid: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Paid' },
      pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, label: 'Pending' },
      overdue: { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle, label: 'Overdue' },
      voided: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle, label: 'Voided' },
      draft: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FileText, label: 'Draft' },
    }
    return configs[status] || configs.pending
  }

  const formatCurrency = (amount: number) => {
    if (amount === undefined || amount === null) return '$0.00'
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (date: string) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 text-lg">No invoices found</p>
        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Due Date</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoices.map((invoice) => {
            const statusConfig = getStatusConfig(invoice.status)
            const StatusIcon = statusConfig.icon
            
            return (
              <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-4">
                  <span className="text-sm font-mono font-medium text-blue-600">
                    {invoice.invoice_number || `#${invoice.id}`}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invoice.user_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{invoice.user_email || 'No email'}</p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(invoice.total)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <Badge className={`${statusConfig.color} border gap-1`}>
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <span className={`text-sm ${invoice.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                    {formatDate(invoice.due_date)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-gray-500">{formatDate(invoice.created_at)}</span>
                </td>
                <td className="px-4 py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[10000]">
                      <DropdownMenuItem onClick={() => onView(invoice)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDownload(invoice)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </DropdownMenuItem>
                      {invoice.status !== 'paid' && invoice.status !== 'voided' && (
                        <>
                          <DropdownMenuItem onClick={() => onSendReminder(invoice)}>
                            <Send className="h-4 w-4 mr-2" />
                            Send Reminder
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onResend(invoice)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Resend Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onMarkPaid(invoice)}>
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Mark as Paid
                          </DropdownMenuItem>
                        </>
                      )}
                      {invoice.status !== 'voided' && (
                        <DropdownMenuItem 
                          onClick={() => onVoid(invoice)}
                          className="text-red-600"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Void Invoice
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}