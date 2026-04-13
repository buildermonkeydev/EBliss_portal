// components/user/UserForm.tsx
'use client'

import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

interface UserFormProps {
  initialData?: {
    email: string
    full_name: string
    password?: string
    role?: string
    phone?: string
    company?: string
    tax_id?: string
  }
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
}

export function UserForm({ initialData, onSubmit, onCancel, isEdit = false }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    full_name: initialData?.full_name || '',
    password: '',
    role: initialData?.role || 'customer',
    phone: initialData?.phone || '',
    company: initialData?.company || '',
    tax_id: initialData?.tax_id || ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!isEdit && !formData.password) {
      newErrors.password = 'Password is required'
    } else if (!isEdit && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    
    if (isEdit && formData.password && formData.password.length < 8) {
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
      // Create submit data without using delete operator
      const { password, ...restFormData } = formData
      
      const submitData = isEdit 
        ? {
            ...restFormData,
            // Only include password if it was provided
            ...(password && { password })
          }
        : formData
      
      await onSubmit(submitData)
      onCancel() // Close dialog on success
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name" className="text-sm font-medium">
          Full Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="full_name"
          placeholder="John Doe"
          value={formData.full_name}
          onChange={(e) => {
            setFormData({ ...formData, full_name: e.target.value })
            setErrors({ ...errors, full_name: '' })
          }}
          className={errors.full_name ? 'border-red-500' : ''}
          disabled={loading}
        />
        {errors.full_name && (
          <p className="text-xs text-red-500">{errors.full_name}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
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
        <Label htmlFor="password" className="text-sm font-medium">
          Password {!isEdit && <span className="text-red-500">*</span>}
          {isEdit && <span className="text-gray-400 text-xs font-normal ml-1">(Leave blank to keep unchanged)</span>}
        </Label>
        <Input
          id="password"
          type="password"
          placeholder={isEdit ? "•••••••• (optional)" : "••••••••"}
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
        {!errors.password && (
          <p className="text-xs text-gray-500">Minimum 8 characters</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="role" className="text-sm font-medium">
          Role
        </Label>
        <select
          id="role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
        >
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
        </select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium">
          Phone <span className="text-gray-400 text-xs font-normal">(Optional)</span>
        </Label>
        <Input
          id="phone"
          placeholder="+1 (555) 123-4567"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          disabled={loading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="company" className="text-sm font-medium">
          Company <span className="text-gray-400 text-xs font-normal">(Optional)</span>
        </Label>
        <Input
          id="company"
          placeholder="Company Name"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          disabled={loading}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="tax_id" className="text-sm font-medium">
          Tax ID <span className="text-gray-400 text-xs font-normal">(Optional)</span>
        </Label>
        <Input
          id="tax_id"
          placeholder="12-3456789"
          value={formData.tax_id}
          onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
          disabled={loading}
        />
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
          className="bg-blue-600 hover:bg-blue-700" 
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              {isEdit ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            isEdit ? 'Save Changes' : 'Create User'
          )}
        </Button>
      </div>
    </form>
  )
}