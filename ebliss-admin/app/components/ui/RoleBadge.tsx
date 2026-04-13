'use client'

import { Shield, Eye, Calculator, Server } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoleBadgeProps {
  role: 'super' | 'accountant' | 'technical' | 'readonly'
  className?: string
}

const roleConfig = {
  super: {
    label: 'Super Admin',
    icon: Shield,
    color: 'bg-purple-100 text-purple-700',
  },
  accountant: {
    label: 'Accountant',
    icon: Calculator,
    color: 'bg-green-100 text-green-700',
  },
  technical: {
    label: 'Technical Admin',
    icon: Server,
    color: 'bg-blue-100 text-blue-700',
  },
  readonly: {
    label: 'Read Only',
    icon: Eye,
    color: 'bg-gray-100 text-gray-700',
  },
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const config = roleConfig[role]
  const Icon = config.icon

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.color, className)}>
      <Icon size={12} />
      {config.label}
    </span>
  )
}