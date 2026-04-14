// app/users/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Search, 
  RefreshCw,
  UserPlus,
  Shield,
  Filter
} from 'lucide-react'
import { LayoutWrapper } from '../components/layout/LayoutWrapper'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useToast } from '../../hooks/use-toast'
import { api } from '../lib/api'
import { UserStatsCards } from '../components/user/UserStatsCards'
import { UsersTable } from '../components/user/UsersTable'
import { AdminsTable } from '../components/user/AdminsTable'
import { UserForm } from '../components/user/UserForm'
import { AdminForm, AdminRole } from '../components/user/AdminForm'

interface CustomerUser {
  id: number
  email: string
  full_name: string
  role: string
  status: 'active' | 'suspended' | 'pending'
  verified: boolean
  wallet_balance: number
  company?: string
  phone?: string
  tax_id?: string
  created_at: string
  vms_count: number
  invoices_count: number
}

interface AdminUser {
  id: number
  email: string
  role: AdminRole
  created_at: string
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  verifiedUsers: number
  totalBalance: number
  verificationRate: number
  pendingUsers?: number
  suspendedUsers?: number
  totalVMs?: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<CustomerUser[]>([])
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<CustomerUser | null>(null)
  const [creditDialog, setCreditDialog] = useState(false)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditReason, setCreditReason] = useState('')
  const [viewDialog, setViewDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [suspendDialog, setSuspendDialog] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [createUserDialog, setCreateUserDialog] = useState(false)
  const [createAdminDialog, setCreateAdminDialog] = useState(false)
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0,
    totalBalance: 0,
    verificationRate: 0,
    pendingUsers: 0,
    suspendedUsers: 0,
    totalVMs: 0
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'customers' | 'admins'>('customers')
  
  const { toast } = useToast()

  useEffect(() => {
    if (activeTab === 'customers') {
      fetchUsers()
      fetchStats()
    } else {
      fetchAdminUsers()
    }
  }, [currentPage, search, roleFilter, activeTab])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users', {
        params: {
          page: currentPage,
          limit: 20,
          search: search || undefined,
          role: roleFilter === 'all' ? undefined : roleFilter
        }
      })
      
      const responseData = response.data
      const usersData = Array.isArray(responseData.data) ? responseData.data : 
                       Array.isArray(responseData) ? responseData : []
      
      setUsers(usersData)
      setTotalPages(responseData.totalPages || Math.ceil((responseData.total || usersData.length) / 20))
    } catch (error: any) {
      console.error('Failed to fetch users:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch users',
        variant: 'destructive'
      })
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAdminUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/admin/admins')
      const adminData = Array.isArray(response.data) ? response.data : 
                       Array.isArray(response.data?.data) ? response.data.data : []
      setAdminUsers(adminData)
    } catch (error: any) {
      console.error('Failed to fetch admin users:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch admin users',
        variant: 'destructive'
      })
      setAdminUsers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/users/stats')
      const statsData = response.data
      
      const usersResponse = await api.get('/users', { params: { limit: 1000 } })
      const usersData = Array.isArray(usersResponse.data.data) ? usersResponse.data.data : 
                       Array.isArray(usersResponse.data) ? usersResponse.data : []
      
      setStats({
        totalUsers: statsData.totalUsers || 0,
        activeUsers: statsData.activeUsers || 0,
        verifiedUsers: statsData.verifiedUsers || 0,
        totalBalance: statsData.totalBalance || 0,
        verificationRate: statsData.verificationRate || 0,
        pendingUsers: usersData.filter((u: CustomerUser) => u.status === 'pending').length,
        suspendedUsers: usersData.filter((u: CustomerUser) => u.status === 'suspended').length,
        totalVMs: usersData.reduce((sum: number, u: CustomerUser) => sum + (u.vms_count || 0), 0)
      })
    } catch (error: any) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleCreateUser = async (data: any) => {
    await api.post('/users', data)
    toast({
      title: 'Success',
      description: `User ${data.full_name} created successfully`,
    })
    setCreateUserDialog(false)
    fetchUsers()
    fetchStats()
  }

  const handleCreateAdmin = async (data: { email: string; password: string; role: AdminRole }) => {
    await api.post('/admin/admins', data)
    toast({
      title: 'Success',
      description: `Admin ${data.email} created successfully`,
    })
    setCreateAdminDialog(false)
    fetchAdminUsers()
  }

  const handleUpdateUser = async (id: number, data: Partial<CustomerUser>) => {
    await api.patch(`/users/${id}`, data)
    toast({
      title: 'Success',
      description: 'User updated successfully',
    })
    setEditDialog(false)
    fetchUsers()
  }

  const handleCreditWallet = async () => {
    if (!selectedUser || !creditAmount || parseFloat(creditAmount) <= 0) return
    
    await api.post(`/wallet/admin/credit/${selectedUser.id}`, {
      amount: parseFloat(creditAmount),
      reason: creditReason
    })
    
    toast({
      title: 'Wallet Credited',
      description: `$${creditAmount} added to ${selectedUser.full_name}'s wallet`,
    })
    setCreditDialog(false)
    setCreditAmount('')
    setCreditReason('')
    fetchUsers()
    fetchStats()
  }

  const handleToggleUserStatus = (user: CustomerUser) => {
    setSelectedUser(user)
    if (user.status === 'active') {
      setSuspendDialog(true)
    } else {
      handleActivateUser(user)
    }
  }

  const handleActivateUser = async (user: CustomerUser) => {
    await api.post(`/users/${user.id}/activate`)
    toast({
      title: 'User Activated',
      description: `${user.full_name} has been activated`,
    })
    fetchUsers()
    fetchStats()
  }

  const handleSuspendUser = async () => {
    if (!selectedUser) return
    
    await api.post(`/users/${selectedUser.id}/suspend`, {
      reason: suspendReason
    })
    
    toast({
      title: 'User Suspended',
      description: `${selectedUser.full_name} has been suspended`,
    })
    setSuspendDialog(false)
    setSuspendReason('')
    fetchUsers()
    fetchStats()
  }

  const handleVerifyUser = async (user: CustomerUser) => {
    await api.post(`/users/${user.id}/verify`)
    toast({
      title: 'User Verified',
      description: `${user.full_name} has been verified`,
    })
    fetchUsers()
    fetchStats()
  }

  const handleDeleteUser = async (user: CustomerUser) => {
    if (!confirm(`Are you sure you want to delete ${user.full_name}?`)) return
    
    await api.delete(`/users/${user.id}`)
    toast({
      title: 'User Deleted',
      description: `${user.full_name} has been deleted`,
    })
    fetchUsers()
    fetchStats()
  }

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (!confirm(`Are you sure you want to delete admin ${admin.email}?`)) return
    
    await api.delete(`/admin/users/${admin.id}`)
    toast({
      title: 'Admin Deleted',
      description: `${admin.email} has been deleted`,
    })
    fetchAdminUsers()
  }

  const filteredAdminUsers = adminUsers.filter(admin => 
    admin.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <LayoutWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage customer accounts and admin users</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setCreateAdminDialog(true)}
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <Shield className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => setCreateUserDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('customers')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'customers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Customers
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {users.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'admins'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Admin Users
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {adminUsers.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Customers Tab Content */}
        {activeTab === 'customers' && (
          <>
            <UserStatsCards stats={stats} />

            {/* Search and Filter */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="accountant">Accountant</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchUsers} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              ) : (
                <>
                  <UsersTable
                    users={users}
                    onView={(user) => { setSelectedUser(user); setViewDialog(true) }}
                    onEdit={(user) => { setSelectedUser(user); setEditDialog(true) }}
                    onCredit={(user) => { setSelectedUser(user); setCreditDialog(true) }}
                    onVerify={handleVerifyUser}
                    onToggleStatus={handleToggleUserStatus}
                    onDelete={handleDeleteUser}
                  />
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50">
                      <p className="text-sm text-gray-600">
                        Page <span className="font-medium">{currentPage}</span> of{' '}
                        <span className="font-medium">{totalPages}</span>
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
                </>
              )}
            </div>
          </>
        )}

        {/* Admins Tab Content */}
        {activeTab === 'admins' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-200 bg-gray-50/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search admin by email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 max-w-md"
                    />
                  </div>
                </div>
                <AdminsTable
                  admins={filteredAdminUsers}
                  onDelete={handleDeleteAdmin}
                />
              </>
            )}
          </div>
        )}
      </div>


      <Dialog open={createUserDialog} onOpenChange={setCreateUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
            <DialogDescription>Add a new customer account</DialogDescription>
          </DialogHeader>
          <UserForm onSubmit={handleCreateUser} onCancel={() => setCreateUserDialog(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={createAdminDialog} onOpenChange={setCreateAdminDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Admin User</DialogTitle>
            <DialogDescription>Add a new administrator account</DialogDescription>
          </DialogHeader>
          <AdminForm onSubmit={handleCreateAdmin} onCancel={() => setCreateAdminDialog(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <UserForm 
              initialData={selectedUser}
              onSubmit={(data) => handleUpdateUser(selectedUser.id, data)}
              onCancel={() => setEditDialog(false)}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={suspendDialog} onOpenChange={setSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend {selectedUser?.full_name || selectedUser?.email}?
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium mb-2 block">Reason (Optional)</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter reason for suspension..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setSuspendDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSuspendUser}>Suspend User</Button>
          </div>
        </DialogContent>
      </Dialog>
    </LayoutWrapper>
  )
}