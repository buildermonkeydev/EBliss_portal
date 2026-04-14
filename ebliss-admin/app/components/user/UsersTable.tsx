// components/users/UsersTable.tsx
'use client'

import { 
  Users, 
  MoreVertical, 
  Shield,
  CreditCard,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Avatar, AvatarFallback } from '../ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

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

interface UsersTableProps {
  users: CustomerUser[]
  onView: (user: CustomerUser) => void
  onEdit: (user: CustomerUser) => void
  onCredit: (user: CustomerUser) => void
  onVerify: (user: CustomerUser) => void
  onToggleStatus: (user: CustomerUser) => void
  onDelete: (user: CustomerUser) => void
}

export function UsersTable({ 
  users, 
  onView, 
  onEdit, 
  onCredit, 
  onVerify, 
  onToggleStatus, 
  onDelete 
}: UsersTableProps) {
  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      customer: 'bg-blue-100 text-blue-700 border-blue-200',
      accountant: 'bg-green-100 text-green-700 border-green-200',
      technical: 'bg-orange-100 text-orange-700 border-orange-200',
      super_admin: 'bg-red-100 text-red-700 border-red-200',
      readonly: 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getStatusBadge = (status: string) => {
    const statuses: Record<string, string> = {
      active: 'bg-green-100 text-green-700 border-green-200',
      suspended: 'bg-red-100 text-red-700 border-red-200',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    }
    return statuses[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="h-10 w-10 text-gray-400" />
        </div>
        <p className="text-gray-500 text-lg">No users found</p>
        <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">VMs</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-gray-100">
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                      {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {user.full_name || user.email}
                      {user.verified && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <Badge className={`${getRoleBadge(user.role)} border`}>
                  {user.role === 'super_admin' && <Shield className="h-3 w-3 mr-1" />}
                  {user.role}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <Badge className={`${getStatusBadge(user.status)} border`}>
                  {user.status === 'active' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                  {user.status}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <span className="font-semibold text-gray-900">
                  ${(user.wallet_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {user.vms_count || 0} VMs
                </span>
              </td>
              <td className="px-6 py-4 text-gray-600 max-w-[150px] truncate">
                {user.company || '-'}
              </td>
              <td className="px-6 py-4 text-gray-500 text-sm">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
              </td>
              <td className="px-6 py-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                  
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit User
                    </DropdownMenuItem>
                    
                    {!user.verified && (
                      <DropdownMenuItem onClick={() => onVerify(user)}>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Verify User
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onToggleStatus(user)}
                      className={user.status === 'active' ? 'text-red-600' : 'text-green-600'}
                    >
                      {user.status === 'active' ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      {user.status === 'active' ? 'Suspend User' : 'Activate User'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(user)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}