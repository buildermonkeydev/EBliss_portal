// app/admin/wallet/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Search,
  Filter,
  RefreshCw,
  Gift,
  Download,
  CreditCard,
} from 'lucide-react'
import { LayoutWrapper } from '../components/layout/LayoutWrapper'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useToast } from '../../hooks/use-toast'
import { walletApi, Transaction, UserWallet, WalletStats, PromoCode } from '../lib/wallet-api'
import { WalletStatsCards } from '../components/wallet/WalletStatsCards'
import { TransactionsTable } from '../components/wallet/TransactionsTable'
import { UsersWalletTable } from '../components/wallet/UsersWalletTable'

export default function AdminWalletPage() {
  const [stats, setStats] = useState<WalletStats>({
    total_balance: 0,
    total_credits: 0,
    total_debits: 0,
    active_users: 0,
    monthly_revenue: 0,
    growth_percentage: 0,
    pending_transactions: 0,
    avg_balance: 0,
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [users, setUsers] = useState<UserWallet[]>([])
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('transactions')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Dialogs
  const [creditDialog, setCreditDialog] = useState(false)
  const [debitDialog, setDebitDialog] = useState(false)
  const [promoDialog, setPromoDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWallet | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [debitAmount, setDebitAmount] = useState('')
  const [transactionReason, setTransactionReason] = useState('')
  
  // Promo form
  const [promoForm, setPromoForm] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    max_uses: '',
    expires_at: '',
  })
  
  const { toast } = useToast()

  useEffect(() => {
    fetchStats()
    if (activeTab === 'transactions') {
      fetchTransactions()
    } else if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'promos') {
      fetchPromos()
    }
  }, [activeTab, currentPage, typeFilter])

  const fetchStats = async () => {
    try {
      const data = await walletApi.getAdminStats()
      setStats(data)
    } catch (error: any) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await walletApi.getAdminTransactions({
        page: currentPage,
        limit: 20,
        type: typeFilter === 'all' ? undefined : (typeFilter as 'credit' | 'debit'),
        search: search || undefined,
      })
      setTransactions(response.data)
      setTotalPages(response.totalPages)
    } catch (error: any) {
      console.error('Failed to fetch transactions:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch transactions',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await walletApi.getAdminUsers({
        page: currentPage,
        limit: 20,
        search: search || undefined,
      })
      setUsers(response.data)
      setTotalPages(response.totalPages)
    } catch (error: any) {
      console.error('Failed to fetch users:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch users',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPromos = async () => {
    try {
      setLoading(true)
      const data = await walletApi.getPromoCodes()
      setPromos(data)
    } catch (error: any) {
      console.error('Failed to fetch promos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCredit = async () => {
    if (!selectedUser || !creditAmount || parseFloat(creditAmount) <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' })
      return
    }
    
    try {
      await walletApi.adminCredit(selectedUser.id, parseFloat(creditAmount), transactionReason || 'Admin credit')
      toast({
        title: 'Success',
        description: `$${creditAmount} credited to ${selectedUser.full_name || selectedUser.email}'s wallet`,
      })
      setCreditDialog(false)
      resetDialogs()
      fetchStats()
      if (activeTab === 'transactions') fetchTransactions()
      if (activeTab === 'users') fetchUsers()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to credit wallet',
        variant: 'destructive',
      })
    }
  }

  const handleDebit = async () => {
    if (!selectedUser || !debitAmount || parseFloat(debitAmount) <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'destructive' })
      return
    }
    
    try {
      await walletApi.adminDebit(selectedUser.id, parseFloat(debitAmount), transactionReason || 'Admin debit')
      toast({
        title: 'Success',
        description: `$${debitAmount} debited from ${selectedUser.full_name || selectedUser.email}'s wallet`,
      })
      setDebitDialog(false)
      resetDialogs()
      fetchStats()
      if (activeTab === 'transactions') fetchTransactions()
      if (activeTab === 'users') fetchUsers()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to debit wallet',
        variant: 'destructive',
      })
    }
  }

  const handleCreatePromo = async () => {
    if (!promoForm.code || !promoForm.value) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' })
      return
    }
    
    try {
      await walletApi.createPromoCode({
        code: promoForm.code.toUpperCase(),
        discount_type: promoForm.discount_type,
        value: parseFloat(promoForm.value),
        max_uses: promoForm.max_uses ? parseInt(promoForm.max_uses) : undefined,
        expires_at: promoForm.expires_at || undefined,
      })
      toast({
        title: 'Success',
        description: `Promo code ${promoForm.code} created`,
      })
      setPromoDialog(false)
      resetPromoForm()
      fetchPromos()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create promo',
        variant: 'destructive',
      })
    }
  }

  const handleSendAlert = (user: UserWallet) => {
    toast({
      title: 'Alert Sent',
      description: `Low balance alert sent to ${user.email}`,
    })
  }

  const resetDialogs = () => {
    setSelectedUser(null)
    setCreditAmount('')
    setDebitAmount('')
    setTransactionReason('')
  }

  const resetPromoForm = () => {
    setPromoForm({
      code: '',
      discount_type: 'percentage',
      value: '',
      max_uses: '',
      expires_at: '',
    })
  }

  return (
    <LayoutWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Wallet Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage user wallets, transactions, and promotions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setPromoDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Gift className="h-4 w-4 mr-2" />
              Create Promo
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <WalletStatsCards stats={stats} loading={loading} />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Gateways</h3>
            <p className="text-sm text-gray-500 mb-4">Stripe, Razorpay, PayPal, Crypto</p>
            <Button variant="outline" className="w-full">Configure</Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center mb-4">
              <Gift className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Promos</h3>
            <p className="text-sm text-gray-500 mb-4">{promos.length} active promo codes</p>
            <Button variant="outline" className="w-full" onClick={() => setActiveTab('promos')}>
              Manage Promos
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
              <RefreshCw className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Auto-Suspend</h3>
            <p className="text-sm text-gray-500 mb-4">Automatically suspend VMs on low balance</p>
            <Button variant="outline" className="w-full">Settings</Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-100 p-1 rounded-lg w-fit">
            <TabsTrigger value="transactions" className="px-6 py-2">
              Transactions
            </TabsTrigger>
            <TabsTrigger value="users" className="px-6 py-2">
              User Wallets
            </TabsTrigger>
            <TabsTrigger value="promos" className="px-6 py-2">
              Promo Codes
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="mt-6">
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by user or description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchTransactions} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <TransactionsTable
                transactions={transactions}
                loading={loading}
                onViewDetails={(t) => console.log('View transaction:', t)}
              />
              
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
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={fetchUsers} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <UsersWalletTable
                users={users}
                loading={loading}
                onCredit={(user) => { setSelectedUser(user); setCreditDialog(true) }}
                onDebit={(user) => { setSelectedUser(user); setDebitDialog(true) }}
                onSendAlert={handleSendAlert}
                onViewDetails={(user) => console.log('View user:', user)}
              />
              
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
          </TabsContent>

          {/* Promos Tab */}
          <TabsContent value="promos" className="mt-6">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Code</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Discount</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Usage</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Expires</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {promos.map((promo) => (
                      <tr key={promo.id}>
                        <td className="px-6 py-4 font-mono text-sm">{promo.code}</td>
                        <td className="px-6 py-4">
                          {promo.discount_type === 'percentage' ? `${promo.value}%` : `$${promo.value}`}
                        </td>
                        <td className="px-6 py-4">{promo.used_count} / {promo.max_uses || '∞'}</td>
                        <td className="px-6 py-4">{new Date(promo.expires_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <Badge className={promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {promo.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {promos.length === 0 && (
                  <div className="text-center py-12">
                    <Gift className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No promo codes found</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Credit Dialog */}
      <Dialog open={creditDialog} onOpenChange={setCreditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credit Wallet</DialogTitle>
            <DialogDescription>
              Add funds to {selectedUser?.full_name || selectedUser?.email}'s wallet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (USD) *</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min="0.01"
                step="0.01"
              />
            </div>
            <div>
              <Label>Reason (Optional)</Label>
              <Input
                placeholder="e.g., Promotional credit, Refund"
                value={transactionReason}
                onChange={(e) => setTransactionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialog(false)}>Cancel</Button>
            <Button onClick={handleCredit} className="bg-green-600 hover:bg-green-700">Add Credit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debit Dialog */}
      <Dialog open={debitDialog} onOpenChange={setDebitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Debit Wallet</DialogTitle>
            <DialogDescription>
              Deduct funds from {selectedUser?.full_name || selectedUser?.email}'s wallet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (USD) *</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={debitAmount}
                onChange={(e) => setDebitAmount(e.target.value)}
                min="0.01"
                step="0.01"
              />
            </div>
            <div>
              <Label>Reason (Optional)</Label>
              <Input
                placeholder="e.g., Chargeback, Correction"
                value={transactionReason}
                onChange={(e) => setTransactionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDebitDialog(false)}>Cancel</Button>
            <Button onClick={handleDebit} className="bg-red-600 hover:bg-red-700">Debit Wallet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Promo Dialog */}
      <Dialog open={promoDialog} onOpenChange={setPromoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Promo Code</DialogTitle>
            <DialogDescription>Create a discount code for wallet top-ups</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Promo Code *</Label>
              <Input
                placeholder="e.g., WELCOME20"
                value={promoForm.code}
                onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type *</Label>
                <Select 
                  value={promoForm.discount_type} 
                  onValueChange={(v: 'percentage' | 'fixed') => setPromoForm({ ...promoForm, discount_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value *</Label>
                <Input
                  type="number"
                  placeholder={promoForm.discount_type === 'percentage' ? '20' : '10'}
                  value={promoForm.value}
                  onChange={(e) => setPromoForm({ ...promoForm, value: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Uses (Optional)</Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={promoForm.max_uses}
                  onChange={(e) => setPromoForm({ ...promoForm, max_uses: e.target.value })}
                />
              </div>
              <div>
                <Label>Expiry Date (Optional)</Label>
                <Input
                  type="date"
                  value={promoForm.expires_at}
                  onChange={(e) => setPromoForm({ ...promoForm, expires_at: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoDialog(false)}>Cancel</Button>
            <Button onClick={handleCreatePromo} className="bg-blue-600 hover:bg-blue-700">Create Promo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  )
}