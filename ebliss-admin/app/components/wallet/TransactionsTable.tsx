// app/components/wallet/TransactionsTable.tsx
'use client'

import { Eye, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Transaction } from '../../lib/wallet-api'

interface TransactionsTableProps {
  transactions: Transaction[]
  loading?: boolean
  onViewDetails?: (transaction: Transaction) => void
}

export function TransactionsTable({ transactions, loading, onViewDetails }: TransactionsTableProps) {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <TrendingUp className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-500 text-lg">No transactions found</p>
        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance After</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                {formatDate(transaction.created_at)}
              </td>
              <td className="px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{transaction.user_name}</p>
                  <p className="text-xs text-gray-500">{transaction.user_email}</p>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                {transaction.description}
              </td>
              <td className="px-6 py-4">
                <Badge className={transaction.type === 'credit' 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-red-100 text-red-700 border-red-200'
                }>
                  {transaction.type === 'credit' 
                    ? <TrendingUp className="h-3 w-3 mr-1" />
                    : <TrendingDown className="h-3 w-3 mr-1" />
                  }
                  {transaction.type}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <span className={`text-sm font-medium ${
                  transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'credit' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm font-mono text-gray-900">
                  {formatCurrency(transaction.balance_after)}
                </span>
              </td>
              <td className="px-6 py-4">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onViewDetails?.(transaction)}
                  className="h-8 w-8"
                >
                  <Eye className="h-4 w-4 text-gray-400" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}