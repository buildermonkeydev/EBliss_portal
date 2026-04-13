'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Server,
  Users,
  FileText,
  Wallet,
  Headphones,
  Settings,Trash2,
  ChevronLeft,
  Menu,
  LogOut,
  User,
  Globe,
  Network,
  Database,
  Cpu,
  Package,
  ShoppingBag,
  ChevronDown,
  Building2,
  HardDrive,
  Shield,
  CreditCard,
  Receipt,
  Activity,
  Key,
  UserCog,
  History,
  Eye , Plus , Edit ,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'

// Role types
type AdminRole = 'super_admin' | 'accountant' | 'technical' | 'readonly'

// Permission types
type Permission = 'create' | 'edit' | 'delete' | 'view'

// Menu item with role-based permissions
interface MenuItemConfig {
  href?: string
  label: string
  icon: any
  children?: MenuItemConfig[]
  roles?: AdminRole[]
  permissions?: Permission[]
}

// Define all menu items with role access
const allMenuItems: MenuItemConfig[] = [
  { 
    href: '/dashboard', 
    label: 'Dashboard', 
    icon: LayoutDashboard,
    roles: ['super_admin', 'accountant', 'technical', 'readonly']
  },
  
  // Products Section
  { 
    label: 'Products', 
    icon: Package,
    roles: ['super_admin', 'accountant', 'technical', 'readonly'],
    children: [
      { 
        href: '/products/list', 
        label: 'All Products', 
        icon: ShoppingBag,
        roles: ['super_admin', 'accountant', 'technical', 'readonly']
      },
      { 
        href: '/products/create', 
        label: 'Add Product', 
        icon: Package,
        roles: ['super_admin', 'accountant'],
        permissions: ['create']
      },
    ]
  },
  
  // Cloud Infrastructure
  { 
    label: 'Cloud', 
    icon: Globe,
    roles: ['super_admin', 'technical', 'readonly'],
    children: [
      { 
        href: '/vms', 
        label: 'Virtual Machines', 
        icon: Server,
        roles: ['super_admin', 'technical', 'readonly']
      },
      { 
        href: '/infrastructure', 
        label: 'Infrastructure', 
        icon: Globe,
        roles: ['super_admin', 'technical', 'readonly']
      },
    ]
  },
  
  // Dedicated Servers
  { 
    label: 'Dedicated Servers', 
    icon: Cpu,
    roles: ['super_admin', 'technical', 'readonly'],
    children: [
      { 
        href: '/dedicated-servers/list', 
        label: 'All Servers', 
        icon: Server,
        roles: ['super_admin', 'technical', 'readonly']
      },
    ]
  },
  
  // Colocation
  { 
    label: 'Colocation', 
    icon: Building2,
    roles: ['super_admin', 'technical', 'readonly'],
    children: [
      { 
        href: '/colocation/list', 
        label: 'All Servers', 
        icon: Server,
        roles: ['super_admin', 'technical', 'readonly']
      },
      { 
        href: '/colocation/create', 
        label: 'Add Colocation', 
        icon: HardDrive,
        roles: ['super_admin', 'technical'],
        permissions: ['create']
      },
    ]
  },
  
  // Users Management
  { 
    href: '/users', 
    label: 'Users', 
    icon: Users,
    roles: ['super_admin', 'accountant', 'readonly']
  },
  
  // Admin Users (Super Admin only)

  // Billing & Invoices
  { 
    href: '/invoices', 
    label: 'Invoices', 
    icon: FileText,
    roles: ['super_admin', 'accountant', 'readonly']
  },
  
  // Wallet & Transactions
  { 
    href: '/wallet', 
    label: 'Wallet', 
    icon: Wallet,
    roles: ['super_admin', 'accountant', 'readonly']
  },
  
  // Support Tickets
  { 
    href: '/support', 
    label: 'Support', 
    icon: Headphones,
    roles: ['super_admin', 'technical', 'readonly']
  },
  
  // Settings (Super Admin only)
  { 
    href: '/settings', 
    label: 'Settings', 
    icon: Settings,
    roles: ['super_admin']
  },
  
  // Audit Logs (Super Admin only)
  // { 
  //   href: '/audit-logs', 
  //   label: 'Audit Logs', 
  //   icon: History,
  //   roles: ['super_admin']
  // },
]

interface SidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
}

interface MenuItemProps {
  item: MenuItemConfig
  open: boolean
  setOpen: (open: boolean) => void
  pathname: string
  userRole: AdminRole
}

function MenuItem({ item, open, setOpen, pathname, userRole }: MenuItemProps) {
  const [expanded, setExpanded] = useState(false)
  const Icon = item.icon
  
  // Auto-expand if any child is active
  useEffect(() => {
    if (item.children) {
      const hasActiveChild = item.children.some((child: any) => 
        pathname === child.href || pathname?.startsWith(child.href + '/')
      )
      if (hasActiveChild) {
        setExpanded(true)
      }
    }
  }, [pathname, item.children])

  // If item has children, render dropdown
  if (item.children) {
    const isAnyChildActive = item.children.some((child: any) => 
      pathname === child.href || pathname?.startsWith(child.href + '/')
    )

    return (
      <div className="space-y-1">
        <button
          onClick={() => open && setExpanded(!expanded)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
            isAnyChildActive
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
            !open && 'justify-center'
          )}
        >
          <Icon size={20} className={cn(isAnyChildActive ? 'text-blue-600 dark:text-blue-400' : '')} />
          {open && (
            <>
              <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
              <ChevronDown 
                size={16} 
                className={cn(
                  'transition-transform duration-200',
                  expanded && 'rotate-180'
                )} 
              />
            </>
          )}
        </button>
        
        {open && expanded && (
          <div className="ml-4 pl-4 border-l border-gray-200 dark:border-gray-700 space-y-1">
            {item.children.map((child: any) => {
              const ChildIcon = child.icon
              const isActive = pathname === child.href || pathname?.startsWith(child.href + '/')
              
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
                    isActive
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                >
                  <ChildIcon size={16} />
                  <span>{child.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Regular menu item
  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
  
  return (
    <Link
      href={item.href!}
      onClick={() => setOpen(false)}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
        isActive
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
        !open && 'justify-center'
      )}
    >
      <Icon size={20} className={cn(isActive ? 'text-blue-600 dark:text-blue-400' : '')} />
      {open && <span className="text-sm font-medium">{item.label}</span>}
    </Link>
  )
}

// Helper function to filter menu items by role
function filterMenuItemsByRole(items: MenuItemConfig[], role: AdminRole): MenuItemConfig[] {
  return items
    .filter(item => {
      // If no roles specified, hide by default
      if (!item.roles) return false
      // Check if user role is allowed
      return item.roles.includes(role)
    })
    .map(item => {
      // Recursively filter children if they exist
      if (item.children) {
        const filteredChildren = filterMenuItemsByRole(item.children, role)
        // Only include parent if it has children after filtering
        if (filteredChildren.length === 0) return null
        return { ...item, children: filteredChildren }
      }
      return item
    })
    .filter((item): item is MenuItemConfig => item !== null)
}

// Helper function to clear all cookies
function clearAllCookies() {
  const cookies = document.cookie.split(';')
  
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i]
    const eqPos = cookie.indexOf('=')
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
    
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=;`
  }
}

// Role badge colors
const roleColors: Record<AdminRole, string> = {
  super_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  accountant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  technical: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  readonly: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
}

// Role display names
const roleDisplayNames: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  accountant: 'Accountant',
  technical: 'Technical',
  readonly: 'Read Only',
}

export function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [userRole, setUserRole] = useState<AdminRole>('readonly')
  const [menuItems, setMenuItems] = useState<MenuItemConfig[]>([])

  useEffect(() => {
    setMounted(true)
    // Get user data from localStorage
    const adminUser = localStorage.getItem('admin_user')
    const regularUser = localStorage.getItem('user')
    const sessionUser = sessionStorage.getItem('user')
    
    const user = adminUser || regularUser || sessionUser
    if (user) {
      try {
        const parsedUser = JSON.parse(user)
        setUserData(parsedUser)
        const role = (parsedUser.role || 'readonly') as AdminRole
        setUserRole(role)
        
        // Filter menu items based on user role
        const filteredMenu = filterMenuItemsByRole(allMenuItems, role)
        setMenuItems(filteredMenu)
      } catch (error) {
        console.error('Failed to parse user data:', error)
      }
    }
  }, [])

  if (!mounted) return null

  const handleLogout = async () => {
    try {
      const adminRefreshToken = localStorage.getItem('admin_refresh_token')
      const userRefreshToken = localStorage.getItem('refresh_token')
      
      if (adminRefreshToken) {
        await api.post('/admin/auth/logout', { refresh_token: adminRefreshToken }).catch(() => {})
      }
      
      if (userRefreshToken) {
        await api.post('/auth/logout', { refresh_token: userRefreshToken }).catch(() => {})
      }
    } catch (error) {
      console.warn('Logout API call failed:', error)
    } finally {
      const localStorageKeys = [
        'admin_token', 'admin_refresh_token', 'admin_user',
        'access_token', 'refresh_token', 'token', 'user',
        'rememberMe', 'session', 'auth_state', 'permissions', 'settings'
      ]
      
      localStorageKeys.forEach(key => localStorage.removeItem(key))
      
      const sessionStorageKeys = [
        'admin_token', 'admin_refresh_token', 'admin_user',
        'access_token', 'refresh_token', 'token', 'user',
        'session', 'auth_state'
      ]
      
      sessionStorageKeys.forEach(key => sessionStorage.removeItem(key))
      
      clearAllCookies()
      
      if (api.defaults.headers.common['Authorization']) {
        delete api.defaults.headers.common['Authorization']
      }
      
      if (window.indexedDB) {
        try {
          const databases = await window.indexedDB.databases?.() || []
          databases.forEach((db: any) => {
            if (db.name) window.indexedDB.deleteDatabase(db.name)
          })
        } catch (error) {
          console.warn('Failed to clear IndexedDB:', error)
        }
      }
      
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys()
          cacheNames.forEach(cacheName => caches.delete(cacheName))
        } catch (error) {
          console.warn('Failed to clear Cache Storage:', error)
        }
      }
      
      window.location.href = '/login'
    }
  }

  // Check if user can perform specific actions
  const canCreate = userRole !== 'readonly'
  const canEdit = userRole !== 'readonly'
  const canDelete = userRole === 'super_admin' || userRole === 'accountant'

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out',
          open ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
          {open ? (
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <Image
                  src="/logo.png"
                  alt="Ebliss Cloud"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Ebliss Cloud
              </span>
            </Link>
          ) : (
            <Link href="/dashboard" className="flex items-center justify-center w-full">
              <div className="relative w-8 h-8">
                <Image
                  src="/logo.png"
                  alt="Ebliss Cloud"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
          )}
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              "hover:bg-gray-100 dark:hover:bg-gray-800",
              !open && "absolute -right-3 top-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm"
            )}
          >
            {open ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 128px)' }}>
          {menuItems.map((item) => (
            <MenuItem
              key={item.href || item.label}
              item={item}
              open={open}
              setOpen={setOpen}
              pathname={pathname || ''}
              userRole={userRole}
            />
          ))}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          {open ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  {userData?.avatar ? (
                    <Image 
                      src={userData.avatar} 
                      alt={userData.name || 'User'} 
                      fill 
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <User size={16} className="text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {userData?.name || userData?.full_name || userData?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {userData?.email || 'user@example.com'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
              
              {/* Role Badge */}
              <div className={cn(
                "px-2 py-1 rounded-md text-xs font-medium text-center",
                roleColors[userRole]
              )}>
                {roleDisplayNames[userRole]}
              </div>
              
              {/* Permission Indicators */}
              {/* <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {canCreate && <span className="flex items-center gap-0.5" title="Can create"><Plus size={12} /> Create</span>}
                {canEdit && <span className="flex items-center gap-0.5" title="Can edit"><Edit size={12} /> Edit</span>}
                {canDelete && <span className="flex items-center gap-0.5" title="Can delete"><Trash2 size={12} /> Delete</span>}
              </div> */}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}