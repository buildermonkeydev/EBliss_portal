'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2,
  UserCog,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'
import { LayoutWrapper } from '../components/layout/LayoutWrapper'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import { RoleBadge } from '../components/ui/RoleBadge'
import { RoleGuard } from '../components/auth/RoleGuard'
import { useAuth } from '@/contexts/AuthContext'
import { PERMISSIONS } from '@/types/roles'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Label } from '../components/ui/label'
import { useToast } from '../../hooks/use-toast'

interface AdminUser {
  id: number
  name: string
  email: string
  role: 'super' | 'accountant' | 'technical' | 'readonly'
  status: 'active' | 'inactive'
  last_login: string
  created_at: string
  avatar?: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'readonly' as AdminUser['role'],
    password: '',
  })
  // const { isSuperAdmin } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    fetchAdminUsers()
  }, [])

  const fetchAdminUsers = async () => {
    try {
      const mockUsers: AdminUser[] = [
        { id: 1, name: 'John Doe', email: 'john@ebliss.com', role: 'super', status: 'active', last_login: '2024-03-28T10:30:00Z', created_at: '2024-01-15T00:00:00Z' },
        { id: 2, name: 'Sarah Smith', email: 'sarah@ebliss.com', role: 'accountant', status: 'active', last_login: '2024-03-27T14:20:00Z', created_at: '2024-02-01T00:00:00Z' },
        { id: 3, name: 'Mike Johnson', email: 'mike@ebliss.com', role: 'technical', status: 'active', last_login: '2024-03-28T09:15:00Z', created_at: '2024-02-15T00:00:00Z' },
        { id: 4, name: 'Emma Wilson', email: 'emma@ebliss.com', role: 'readonly', status: 'inactive', last_login: '2024-03-20T11:00:00Z', created_at: '2024-03-01T00:00:00Z' },
      ]
      setUsers(mockUsers)
    } catch (error) {
      console.error('Failed to fetch admin users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' })
      return
    }
    toast({ title: 'Success', description: `Admin user ${newUser.name} created successfully` })
    setCreateDialog(false)
    setNewUser({ name: '', email: '', role: 'readonly', password: '' })
    fetchAdminUsers()
  }

  const handleEditUser = async () => {
    if (!selectedUser) return
    toast({ title: 'Success', description: `${selectedUser.name}'s role updated` })
    setEditDialog(false)
    setSelectedUser(null)
    fetchAdminUsers()
  }

  const handleDeleteUser = (user: AdminUser) => {
    toast({ title: 'User Deleted', description: `${user.name} has been removed` })
  }

  const handleResendInvite = (user: AdminUser) => {
    toast({ title: 'Invite Sent', description: `Invitation resent to ${user.email}` })
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    inactive: users.filter(u => u.status === 'inactive').length,
  }

  if (loading) {
    return (
      <LayoutWrapper>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading administrators...</p>
        </div>
      </LayoutWrapper>
    )
  }

  return (
    <RoleGuard roles={['super']} permissions={PERMISSIONS.VIEW_ADMIN_USERS}>
      <LayoutWrapper>
        <div className="admin-users-container">

          {/* Header */}
          <div className="header-section">
            <div>
              <h1 className="header-title">Administrators</h1>
              <p className="header-description">Manage admin accounts and role-based permissions</p>
            </div>
            {/* {isSuperAdmin && (
              <Button onClick={() => setCreateDialog(true)} className="create-button">
                <Plus size={16} />
                Add Administrator
              </Button>
            )} */}
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">
                <Shield size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Admins</span>
                <span className="stat-value">{stats.total}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">
                <CheckCircle size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Active</span>
                <span className="stat-value">{stats.active}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">
                <XCircle size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Inactive</span>
                <span className="stat-value">{stats.inactive}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">
                <UserCog size={20} />
              </div>
              <div className="stat-info">
                <span className="stat-label">Total Roles</span>
                <span className="stat-value">4</span>
              </div>
            </div>
          </div>

          {/* Search and Filters - Fixed Alignment */}
          <div className="search-actions-bar">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon-inside" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input-field"
              />
            </div>
            <div className="action-buttons">
              <Button variant="outline" size="default" className="filter-btn">
                <Filter size={16} className="mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="icon" className="refresh-btn" onClick={fetchAdminUsers}>
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>

          {/* Users Grid */}
          <div className="users-grid">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="user-card">
                <CardContent className="user-card-content">
                  <div className="user-header">
                    <div className="user-avatar-wrapper">
                      <Avatar className="user-avatar">
                        <AvatarFallback className="user-avatar-fallback">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`status-dot ${user.status}`} />
                    </div>
                    <div className="user-info">
                      <h3 className="user-name">{user.name}</h3>
                      <p className="user-email">{user.email}</p>
                    </div>
                    {/* {isSuperAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="user-menu">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedUser(user); setEditDialog(true) }}>
                            <Edit size={14} className="mr-2" />
                            Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResendInvite(user)}>
                            <Mail size={14} className="mr-2" />
                            Resend Invite
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-red-600">
                            <Trash2 size={14} className="mr-2" />
                            Remove Admin
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )} */}
                  </div>

                  <div className="user-details">
                    <div className="detail-item">
                      <RoleBadge role={user.role} />
                    </div>
                    <div className="detail-item">
                      <Badge className={getStatusColor(user.status)}>
                        {user.status === 'active' ? (
                          <CheckCircle size={12} className="mr-1" />
                        ) : (
                          <XCircle size={12} className="mr-1" />
                        )}
                        {user.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="user-meta">
                    <div className="meta-item">
                      <Clock size={14} />
                      <span>Last login: {new Date(user.last_login).toLocaleDateString()}</span>
                    </div>
                    <div className="meta-item">
                      <Calendar size={14} />
                      <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredUsers.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <Shield size={48} />
              </div>
              <h3 className="empty-title">No administrators found</h3>
              <p className="empty-description">
                {search ? 'Try adjusting your search criteria' : 'Create your first admin user to get started'}
              </p>
              {/* {!search && isSuperAdmin && (
                <Button onClick={() => setCreateDialog(true)} className="empty-button">
                  <Plus size={16} />
                  Add Administrator
                </Button>
              )} */}
            </div>
          )}
        </div>

        {/* Create Admin Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent className="dialog-content">
            <DialogHeader>
              <DialogTitle className="dialog-title">Add Administrator</DialogTitle>
              <DialogDescription className="dialog-description">
                Create a new admin account with specific role permissions
              </DialogDescription>
            </DialogHeader>
            <div className="dialog-form">
              <div className="form-group">
                <Label>Full Name</Label>
                <Input
                  placeholder="Enter full name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="admin@ebliss.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <Label>Role</Label>
                <Select value={newUser.role} onValueChange={(val) => setNewUser({ ...newUser, role: val as AdminUser['role'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super">Super Admin - Full system access</SelectItem>
                    <SelectItem value="accountant">Accountant - Billing & Finance</SelectItem>
                    <SelectItem value="technical">Technical Admin - Infrastructure & Support</SelectItem>
                    <SelectItem value="readonly">Read Only - View only access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="form-group">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateAdmin} className="create-dialog-btn">Create Admin</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="dialog-content">
            <DialogHeader>
              <DialogTitle className="dialog-title">Edit Admin Role</DialogTitle>
              <DialogDescription className="dialog-description">
                Change role for {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="dialog-form">
              <div className="form-group">
                <Label>Role</Label>
                <Select value={selectedUser?.role} onValueChange={(val) => setSelectedUser({ ...selectedUser!, role: val as AdminUser['role'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super">Super Admin (Full Access)</SelectItem>
                    <SelectItem value="accountant">Accountant (Billing & Finance)</SelectItem>
                    <SelectItem value="technical">Technical Admin (Infrastructure)</SelectItem>
                    <SelectItem value="readonly">Read Only (View Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="role-permissions-preview">
                <p className="preview-title">Permissions for this role:</p>
                <ul className="preview-list">
                  {selectedUser?.role === 'super' && (
                    <>
                      <li>✓ Full system access</li>
                      <li>✓ Manage all users and admins</li>
                      <li>✓ Configure billing and payments</li>
                      <li>✓ Manage infrastructure</li>
                      <li>✓ View audit logs</li>
                    </>
                  )}
                  {selectedUser?.role === 'accountant' && (
                    <>
                      <li>✓ View and manage invoices</li>
                      <li>✓ Process payments</li>
                      <li>✓ Credit/debit wallets</li>
                      <li>✓ Configure payment gateways</li>
                      <li>✓ View reports</li>
                    </>
                  )}
                  {selectedUser?.role === 'technical' && (
                    <>
                      <li>✓ Manage VMs and infrastructure</li>
                      <li>✓ Configure IPAM and networking</li>
                      <li>✓ Handle support tickets</li>
                      <li>✓ View system logs</li>
                      <li>✓ Manage SSH keys</li>
                    </>
                  )}
                  {selectedUser?.role === 'readonly' && (
                    <>
                      <li>✓ View all sections</li>
                      <li>✗ No create/edit permissions</li>
                      <li>✗ Cannot modify settings</li>
                      <li>✗ Cannot manage users</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
              <Button onClick={handleEditUser}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <style jsx>{`
          .admin-users-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
          }

          /* Header */
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
          }
          .header-title {
            font-size: 1.75rem;
            font-weight: 600;
            margin: 0 0 0.25rem;
            color: #000;
          }
          .header-description {
            font-size: 0.875rem;
            color: #6b7280;
            margin: 0;
          }
          .create-button {
            background: #3b82f6;
            gap: 0.5rem;
          }

          /* Stats Cards */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
            margin-bottom: 2rem;
          }
          .stat-card {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 0.75rem;
            padding: 1rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .stat-icon {
            width: 2.5rem;
            height: 2.5rem;
            border-radius: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .stat-icon.blue { background: #eff6ff; color: #3b82f6; }
          .stat-icon.green { background: #d1fae5; color: #10b981; }
          .stat-icon.red { background: #fee2e2; color: #ef4444; }
          .stat-icon.purple { background: #ede9fe; color: #8b5cf6; }
          .stat-info {
            display: flex;
            flex-direction: column;
          }
          .stat-label {
            font-size: 0.75rem;
            color: #6b7280;
          }
          .stat-value {
            font-size: 1.5rem;
            font-weight: 600;
            color: #000;
          }

          /* Search and Actions Bar - FIXED */
          .search-actions-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }
          .search-input-wrapper {
            flex: 1;
            position: relative;
            max-width: 400px;
          }
          .search-icon-inside {
            position: absolute;
            left: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            color: #9ca3af;
            pointer-events: none;
            z-index: 1;
          }
          .search-input-field {
            width: 100%;
            padding-left: 2.25rem;
          }
          .action-buttons {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .filter-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .refresh-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* Users Grid */
          .users-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
            gap: 1rem;
          }
          .user-card {
            border: 1px solid #e5e7eb;
            border-radius: 0.75rem;
            transition: all 0.2s;
          }
          .user-card:hover {
            border-color: #3b82f6;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }
          .user-card-content {
            padding: 1.25rem;
          }
          .user-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
          }
          .user-avatar-wrapper {
            position: relative;
          }
          .user-avatar {
            width: 3rem;
            height: 3rem;
          }
          .user-avatar-fallback {
            background: #eff6ff;
            color: #3b82f6;
            font-weight: 600;
            font-size: 1rem;
          }
          .status-dot {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 0.75rem;
            height: 0.75rem;
            border-radius: 50%;
            border: 2px solid #fff;
          }
          .status-dot.active {
            background: #10b981;
          }
          .status-dot.inactive {
            background: #ef4444;
          }
          .user-info {
            flex: 1;
          }
          .user-name {
            font-size: 1rem;
            font-weight: 600;
            margin: 0 0 0.125rem;
            color: #000;
          }
          .user-email {
            font-size: 0.75rem;
            color: #6b7280;
            margin: 0;
          }
          .user-menu {
            opacity: 0;
            transition: opacity 0.2s;
          }
          .user-card:hover .user-menu {
            opacity: 1;
          }
          .user-details {
            display: flex;
            gap: 0.75rem;
            margin-bottom: 1rem;
          }
          .detail-item {
            display: flex;
            align-items: center;
          }
          .user-meta {
            display: flex;
            gap: 1rem;
            padding-top: 0.75rem;
            border-top: 1px solid #e5e7eb;
          }
          .meta-item {
            display: flex;
            align-items: center;
            gap: 0.375rem;
            font-size: 0.7rem;
            color: #6b7280;
          }

          /* Empty State */
          .empty-state {
            text-align: center;
            padding: 4rem 2rem;
            background: #f9fafb;
            border-radius: 1rem;
            border: 1px solid #e5e7eb;
          }
          .empty-icon {
            width: 5rem;
            height: 5rem;
            margin: 0 auto 1rem;
            background: #eff6ff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #3b82f6;
          }
          .empty-title {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #000;
          }
          .empty-description {
            font-size: 0.875rem;
            color: #6b7280;
            margin-bottom: 1.5rem;
          }
          .empty-button {
            background: #3b82f6;
          }

          /* Dialog */
          .dialog-content :global(.dialog-content) {
            border-radius: 1rem;
          }
          .dialog-title {
            font-size: 1.125rem;
            font-weight: 600;
          }
          .dialog-description {
            color: #6b7280;
          }
          .dialog-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          .role-permissions-preview {
            background: #f9fafb;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-top: 0.5rem;
          }
          .preview-title {
            font-size: 0.75rem;
            font-weight: 500;
            color: #6b7280;
            margin-bottom: 0.5rem;
          }
          .preview-list {
            list-style: none;
            padding: 0;
            margin: 0;
            font-size: 0.75rem;
            color: #374151;
          }
          .preview-list li {
            margin-bottom: 0.25rem;
          }
          .create-dialog-btn {
            background: #3b82f6;
          }

          /* Loading */
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 1rem;
          }
          .loading-spinner {
            width: 2rem;
            height: 2rem;
            border: 2px solid #e5e7eb;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          /* Responsive */
          @media (max-width: 1024px) {
            .stats-grid {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          @media (max-width: 768px) {
            .admin-users-container {
              padding: 1rem;
            }
            .stats-grid {
              grid-template-columns: 1fr;
            }
            .users-grid {
              grid-template-columns: 1fr;
            }
            .header-section {
              flex-direction: column;
              align-items: flex-start;
            }
            .search-actions-bar {
              flex-direction: column;
              align-items: stretch;
            }
            .search-input-wrapper {
              max-width: none;
            }
            .action-buttons {
              justify-content: flex-end;
            }
          }
        `}</style>
      </LayoutWrapper>
    </RoleGuard>
  )
}