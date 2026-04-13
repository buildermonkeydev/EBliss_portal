'use client'

import { 
  Server, 
  UserPlus, 
  FileText, 
  CreditCard, 
  MessageSquare,
  Settings,
  TrendingUp,
  Zap
} from 'lucide-react'

interface Action {
  id: number
  name: string
  description: string
  icon: any
  color: string
  bgColor: string
  href: string
}

export function QuickActions() {
  const actions: Action[] = [
    {
      id: 1,
      name: 'Create VM',
      description: 'Deploy a new virtual machine',
      icon: Server,
      color: '#3b82f6',
      bgColor: 'bg-blue-50',
      href: '/vms/create'
    },
    {
      id: 2,
      name: 'Add User',
      description: 'Create a new customer account',
      icon: UserPlus,
      color: '#10b981',
      bgColor: 'bg-green-50',
      href: '/users/create'
    },
    {
      id: 3,
      name: 'Generate Invoice',
      description: 'Create a new invoice',
      icon: FileText,
      color: '#f59e0b',
      bgColor: 'bg-orange-50',
      href: '/invoices/create'
    },
    {
      id: 4,
      name: 'Credit Wallet',
      description: 'Add funds to user wallet',
      icon: CreditCard,
      color: '#8b5cf6',
      bgColor: 'bg-purple-50',
      href: '/wallet/credit'
    },
    {
      id: 5,
      name: 'View Tickets',
      description: 'Check support requests',
      icon: MessageSquare,
      color: '#ef4444',
      bgColor: 'bg-red-50',
      href: '/support'
    },
    {
      id: 6,
      name: 'Analytics',
      description: 'View platform metrics',
      icon: TrendingUp,
      color: '#06b6d4',
      bgColor: 'bg-cyan-50',
      href: '/analytics'
    }
  ]

  return (
    <div className="quick-actions">
      <div className="actions-header">
        <h3 className="actions-title">Quick Actions</h3>
        <p className="actions-description">Common tasks to manage your platform</p>
      </div>
      <div className="actions-grid">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button key={action.id} className="action-card">
              <div className={`action-icon-wrapper ${action.bgColor}`}>
                <Icon className="action-icon" style={{ color: action.color }} />
              </div>
              <div className="action-info">
                <span className="action-name">{action.name}</span>
                <span className="action-description">{action.description}</span>
              </div>
            </button>
          )
        })}
      </div>

      <style jsx>{`
        .quick-actions {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          padding: 1.5rem;
        }
        .actions-header {
          margin-bottom: 1.5rem;
        }
        .actions-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 0 0 0.25rem;
          color: #000;
        }
        .actions-description {
          font-size: 0.75rem;
          color: #6b7280;
          margin: 0;
        }
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }
        .action-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          text-align: left;
        }
        .action-card:hover {
          border-color: #3b82f6;
          background: #fff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .action-icon-wrapper {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .action-icon {
          width: 1.25rem;
          height: 1.25rem;
        }
        .action-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .action-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #000;
        }
        .action-description {
          font-size: 0.7rem;
          color: #6b7280;
        }
        @media (max-width: 640px) {
          .actions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}