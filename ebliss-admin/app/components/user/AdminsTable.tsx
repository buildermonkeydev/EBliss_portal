// components/users/AdminsTable.tsx
'use client'

import { Shield, MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Avatar, AvatarFallback } from '../ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { AdminRole } from './AdminForm'

interface AdminUser {
  id: number
  email: string
  role: AdminRole
  created_at: string
}

interface AdminsTableProps {
  admins: AdminUser[]
  onDelete: (admin: AdminUser) => void
}

export function AdminsTable({ admins, onDelete }: AdminsTableProps) {
  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-red-100 text-red-700 border-red-200',
      accountant: 'bg-green-100 text-green-700 border-green-200',
      technical: 'bg-orange-100 text-orange-700 border-orange-200',
      readonly: 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[role] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getRoleDisplay = (role: AdminRole) => {
    const displays = {
      [AdminRole.SUPER_ADMIN]: 'Super Admin',
      [AdminRole.ACCOUNTANT]: 'Accountant',
      [AdminRole.TECHNICAL]: 'Technical Support',
      [AdminRole.READONLY]: 'Read Only'
    }
    return displays[role] || role
  }

  if (admins.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="h-10 w-10 text-purple-400" />
        </div>
        <p className="text-gray-500 text-lg">No admin users found</p>
        <p className="text-sm text-gray-400 mt-1">Click "Add Admin" to create one</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {admins.map((admin) => (
            <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-purple-100">
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white">
                      {admin.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-gray-900">{admin.email}</div>
                    <div className="text-sm text-gray-500">ID: {admin.id}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <Badge className={`${getRoleBadge(admin.role)} border`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {getRoleDisplay(admin.role)}
                </Badge>
              </td>
              <td className="px-6 py-4 text-gray-500 text-sm">
                {new Date(admin.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => onDelete(admin)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Admin
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