// app/components/invoices/InvoiceDetailView.tsx
'use client'

import { Download, CheckCircle, X, Calendar, User, Building } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Invoice } from '../../lib/invoice-api'

interface InvoiceDetailViewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
  onDownload: (invoice: Invoice) => void
  onMarkPaid: (invoice: Invoice) => void
  onRefresh: () => void
}

export function InvoiceDetailView({ 
  open, 
  onOpenChange, 
  invoice, 
  onDownload, 
  onMarkPaid,
  onRefresh 
}: InvoiceDetailViewProps) {
  if (!invoice) return null

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      paid: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Paid' },
      pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Pending' },
      overdue: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Overdue' },
      voided: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Voided' },
      draft: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Draft' },
    }
    return configs[status] || configs.pending
  }

  const statusConfig = getStatusConfig(invoice.status)

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0.00'
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (date: string | undefined): string => {
    if (!date) return 'N/A'
    try {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return 'Invalid Date'
    }
  }

  const handleMarkPaidClick = async () => {
    await onMarkPaid(invoice)
    onRefresh()
  }

  const items = invoice.items || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice {invoice.invoice_number || `#${invoice.id}`}</span>
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </DialogTitle>
          <DialogDescription>
            Created on {formatDate(invoice.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Details */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                <User className="h-3 w-3" /> Customer
              </p>
              <p className="font-medium text-gray-900">{invoice.user_name || 'Unknown'}</p>
              <p className="text-sm text-gray-600">{invoice.user_email || 'No email'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                <Building className="h-3 w-3" /> Company
              </p>
              <p className="text-gray-900">{invoice.company_name || '-'}</p>
              <p className="text-sm text-gray-600">Tax ID: {invoice.tax_id || '-'}</p>
            </div>
          </div>

          {/* Billing Period */}
          {invoice.billing_period_start && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                Billing Period: {formatDate(invoice.billing_period_start)} 
                {invoice.billing_period_end && ` - ${formatDate(invoice.billing_period_end)}`}
              </span>
            </div>
          )}

          {/* Items Table */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Invoice Items</h4>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs font-medium text-gray-500">Description</th>
                  <th className="text-center py-2 text-xs font-medium text-gray-500">Qty</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Unit Price</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length > 0 ? (
                  items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 text-sm text-gray-900">{item.description}</td>
                      <td className="py-3 text-sm text-gray-600 text-center">{item.quantity}</td>
                      <td className="py-3 text-sm text-gray-600 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.total)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-sm text-gray-500 text-center">
                      No items found for this invoice
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={3} className="py-2 text-sm text-gray-600 text-right">Subtotal:</td>
                  <td className="py-2 text-sm text-gray-900 text-right">{formatCurrency(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 text-sm text-gray-600 text-right">Tax ({invoice.tax_rate || 0}%):</td>
                  <td className="py-2 text-sm text-gray-900 text-right">{formatCurrency(invoice.tax_amount)}</td>
                </tr>
                <tr className="border-t border-gray-200">
                  <td colSpan={3} className="py-3 text-base font-semibold text-gray-900 text-right">Total:</td>
                  <td className="py-3 text-base font-bold text-blue-600 text-right">{formatCurrency(invoice.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Due Date</p>
              <p className={`font-medium ${invoice.status === 'overdue' ? 'text-red-600' : 'text-gray-900'}`}>
                {formatDate(invoice.due_date)}
              </p>
            </div>
            {invoice.paid_at && (
              <div>
                <p className="text-gray-500">Paid Date</p>
                <p className="font-medium text-green-600">{formatDate(invoice.paid_at)}</p>
              </div>
            )}
          </div>

          {/* Payment Details from items_json */}
          {invoice.items_json?.payment_details && (
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-500">Payment ID:</span>
                  <span className="text-gray-900 font-mono">{invoice.items_json.payment_details.payment_id}</span>
                  <span className="text-gray-500">Method:</span>
                  <span className="text-gray-900 capitalize">{invoice.items_json.payment_details.payment_method}</span>
                  <span className="text-gray-500">Amount:</span>
                  <span className="text-gray-900">{formatCurrency(invoice.items_json.payment_details.amount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button variant="outline" onClick={() => onDownload(invoice)}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          {invoice.status !== 'paid' && invoice.status !== 'voided' && (
            <Button onClick={handleMarkPaidClick} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}