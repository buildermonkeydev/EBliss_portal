// app/components/wallet/UsersWalletTable.tsx
'use client'

import { useState } from 'react'
import { MoreVertical, CreditCard, Send, CheckCircle, XCircle, Eye, Mail, X, Calendar, Server, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { UserWallet } from '../../lib/wallet-api'
import { useToast } from '../../../hooks/use-toast'
import { walletApi } from '../../lib/wallet-api'

interface UsersWalletTableProps {
  users: UserWallet[]
  loading?: boolean
  onCredit: (user: UserWallet) => void
  onDebit: (user: UserWallet) => void
  onSendAlert: (user: UserWallet) => void
  onViewDetails: (user: UserWallet) => void
}

export function UsersWalletTable({ 
  users, 
  loading, 
  onCredit, 
  onDebit,
  onSendAlert, 
  onViewDetails 
}: UsersWalletTableProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [alertDialogOpen, setAlertDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWallet | null>(null)
  const [userDetails, setUserDetails] = useState<any>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [alertSubject, setAlertSubject] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [sending, setSending] = useState(false)
  
  const { toast } = useToast()

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleViewDetails = async (user: UserWallet) => {
    setSelectedUser(user)
    setViewDialogOpen(true)
    setDetailsLoading(true)
    
    try {
      // Fetch user details including balance history and monthly statement
      const [balanceHistory, monthlyStatement] = await Promise.all([
        walletApi.getBalanceHistory(user.id, 30),
        walletApi.getMonthlyStatement(user.id, new Date().getFullYear(), new Date().getMonth() + 1),
      ])
      
      setUserDetails({
        balanceHistory,
        monthlyStatement,
      })
    } catch (error) {
      console.error('Failed to fetch user details:', error)
      toast({
        title: 'Error',
        description: 'Failed to load user details',
        variant: 'destructive',
      })
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleSendAlert = (user: UserWallet) => {
    setSelectedUser(user)
    setAlertSubject(`Important: Your Wallet Balance Alert`)
    setAlertMessage(`Dear ${user.full_name || user.email},\n\nYour current wallet balance is ${formatCurrency(user.balance)}. Please add funds to avoid service interruption.\n\nThank you,\nEbliss Cloud Team`)
    setAlertDialogOpen(true)
  }

  const handleSendAlertSubmit = async () => {
    if (!selectedUser || !alertSubject.trim() || !alertMessage.trim()) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' })
      return
    }
    
    setSending(true)
    try {
      // Call API to send email alert
      await walletApi.sendAlert(selectedUser.id, alertSubject, alertMessage)
      toast({
        title: 'Alert Sent',
        description: `Email alert sent to ${selectedUser.email}`,
      })
      setAlertDialogOpen(false)
      resetAlertForm()
      onSendAlert(selectedUser)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send alert',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const resetAlertForm = () => {
    setSelectedUser(null)
    setAlertSubject('')
    setAlertMessage('')
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <CreditCard className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-500 text-lg">No users found</p>
        <p className="text-sm text-gray-400 mt-1">Try adjusting your search</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">VMs</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Activity</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.full_name || user.email}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-medium ${user.balance < 10 ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {formatCurrency(user.balance)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className="text-xs">
                    {user.vms_count} VMs
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <Badge className={user.status === 'active' 
                    ? 'bg-green-100 text-green-700 border-green-200' 
                    : 'bg-red-100 text-red-700 border-red-200'
                  }>
                    {user.status === 'active' 
                      ? <CheckCircle className="h-3 w-3 mr-1" />
                      : <XCircle className="h-3 w-3 mr-1" />
                    }
                    {user.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDate(user.last_transaction)}
                </td>
                <td className="px-6 py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[10000]">
                      <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCredit(user)}>
                        <CreditCard className="h-4 w-4 mr-2 text-green-600" />
                        Credit Wallet
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDebit(user)}>
                        <CreditCard className="h-4 w-4 mr-2 text-red-600" />
                        Debit Wallet
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSendAlert(user)}>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Alert
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wallet Details</DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name || selectedUser?.email} - Current Balance: {formatCurrency(selectedUser?.balance || 0)}
            </DialogDescription>
          </DialogHeader>
          
          {detailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">Balance History</TabsTrigger>
                <TabsTrigger value="statement">Monthly Statement</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Current Balance</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedUser?.balance || 0)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Active VMs</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedUser?.vms_count || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <Badge className={selectedUser?.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                    }>
                      {selectedUser?.status}
                    </Badge>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Verified</p>
                    <Badge className={selectedUser?.verified 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                    }>
                      {selectedUser?.verified ? 'Verified' : 'Pending'}
                    </Badge>
                  </div>
                </div>
                
                {userDetails?.monthlyStatement?.summary && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-gray-900 mb-3">This Month Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Credits</span>
                        <span className="text-sm font-medium text-green-600">
                          +{formatCurrency(userDetails.monthlyStatement.summary.totalCredits)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Debits</span>
                        <span className="text-sm font-medium text-red-600">
                          -{formatCurrency(userDetails.monthlyStatement.summary.totalDebits)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Net Change</span>
                        <span className={`text-sm font-medium ${
                          userDetails.monthlyStatement.summary.totalCredits - userDetails.monthlyStatement.summary.totalDebits >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {userDetails.monthlyStatement.summary.totalCredits - userDetails.monthlyStatement.summary.totalDebits >= 0 ? '+' : ''}
                          {formatCurrency(userDetails.monthlyStatement.summary.totalCredits - userDetails.monthlyStatement.summary.totalDebits)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="history" className="mt-4">
                {userDetails?.balanceHistory?.length > 0 ? (
                  <div className="space-y-2">
                    {userDetails.balanceHistory.slice(-10).reverse().map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">{formatDateTime(item.date)}</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(item.balance)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No balance history available</p>
                )}
              </TabsContent>
              
              <TabsContent value="statement" className="mt-4">
                {userDetails?.monthlyStatement?.vms?.length > 0 ? (
                  <div className="space-y-3">
                    {userDetails.monthlyStatement.vms.map((vm: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">{vm.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{vm.hoursRunning} hours</p>
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(vm.hourlyRate)}/hr</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No VM usage this month</p>
                )}
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Alert Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Alert to User</DialogTitle>
            <DialogDescription>
              Send an email alert to {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Recipient</Label>
              <Input value={selectedUser?.email || ''} disabled className="bg-gray-50" />
            </div>
            
            <div>
              <Label>Subject *</Label>
              <Input
                placeholder="Alert subject"
                value={alertSubject}
                onChange={(e) => setAlertSubject(e.target.value)}
              />
            </div>
            
            <div>
              <Label>Message *</Label>
              <Textarea
                placeholder="Type your alert message here..."
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                rows={6}
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                This will send an email to {selectedUser?.email}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAlertDialogOpen(false)
              resetAlertForm()
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendAlertSubmit}
              disabled={sending || !alertSubject.trim() || !alertMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Alert
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}