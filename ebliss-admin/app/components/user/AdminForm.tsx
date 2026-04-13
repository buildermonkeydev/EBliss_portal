// components/user/AdminForm.tsx
'use client'

import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ACCOUNTANT = 'accountant',
  TECHNICAL = 'technical',
  READONLY = 'readonly'
}

interface AdminFormProps {
  onSubmit: (data: { email: string; password: string; role: AdminRole }) => Promise<void>
  onCancel: () => void
}

export function AdminForm({ onSubmit, onCancel }: AdminFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: AdminRole.READONLY
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    try {
      await onSubmit(formData)
      onCancel() // Close dialog on success
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleDescription = (role: AdminRole) => {
    const descriptions = {
      [AdminRole.SUPER_ADMIN]: 'Full access to all features and settings',
      [AdminRole.ACCOUNTANT]: 'Access to billing, invoices, and financial data',
      [AdminRole.TECHNICAL]: 'Access to VM management and technical support',
      [AdminRole.READONLY]: 'View-only access to all data'
    }
    return descriptions[role]
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="admin-email" className="text-sm font-medium">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="admin-email"
          type="email"
          placeholder="admin@example.com"
          value={formData.email}
          onChange={(e) => {
            setFormData({ ...formData, email: e.target.value })
            setErrors({ ...errors, email: '' })
          }}
          className={errors.email ? 'border-red-500' : ''}
          disabled={loading}
        />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="admin-password" className="text-sm font-medium">
          Password <span className="text-red-500">*</span>
        </Label>
        <Input
          id="admin-password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={(e) => {
            setFormData({ ...formData, password: e.target.value })
            setErrors({ ...errors, password: '' })
          }}
          className={errors.password ? 'border-red-500' : ''}
          disabled={loading}
        />
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password}</p>
        )}
        <p className="text-xs text-gray-500">Minimum 8 characters</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="admin-role" className="text-sm font-medium">
          Role <span className="text-red-500">*</span>
        </Label>
        <Select 
          value={formData.role} 
          onValueChange={(value: AdminRole) => setFormData({ ...formData, role: value })}
          disabled={loading}
        >
          <SelectTrigger id="admin-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AdminRole.SUPER_ADMIN}>Super Admin</SelectItem>
            <SelectItem value={AdminRole.ACCOUNTANT}>Accountant</SelectItem>
            <SelectItem value={AdminRole.TECHNICAL}>Technical Support</SelectItem>
            <SelectItem value={AdminRole.READONLY}>Read Only</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          {getRoleDescription(formData.role)}
        </p>
      </div>
      
      <div className="flex justify-end gap-3 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          className="bg-purple-600 hover:bg-purple-700" 
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              Creating...
            </>
          ) : (
            'Create Admin'
          )}
        </Button>
      </div>
    </form>
  )
}