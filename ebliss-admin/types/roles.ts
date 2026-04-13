export type UserRole = 'super' | 'accountant' | 'technical' | 'readonly'

export interface Permission {
  id: string
  name: string
  description: string
  module: string
}

export interface RolePermissions {
  role: UserRole
  permissions: string[]
}

// Permission definitions
export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: 'view_dashboard',
  
  // Users
  VIEW_USERS: 'view_users',
  CREATE_USER: 'create_user',
  EDIT_USER: 'edit_user',
  DELETE_USER: 'delete_user',
  SUSPEND_USER: 'suspend_user',
  IMPERSONATE_USER: 'impersonate_user',
  
  // VMs
  VIEW_VMS: 'view_vms',
  CREATE_VM: 'create_vm',
  EDIT_VM: 'edit_vm',
  DELETE_VM: 'delete_vm',
  START_VM: 'start_vm',
  STOP_VM: 'stop_vm',
  RESTART_VM: 'restart_vm',
  REBUILD_VM: 'rebuild_vm',
  
  // Infrastructure
  VIEW_INFRA: 'view_infra',
  CREATE_POP: 'create_pop',
  EDIT_POP: 'edit_pop',
  DELETE_POP: 'delete_pop',
  CREATE_NODE: 'create_node',
  EDIT_NODE: 'edit_node',
  DELETE_NODE: 'delete_node',
  VIEW_NODE_METRICS: 'view_node_metrics',
  
  // IPAM
  VIEW_IPAM: 'view_ipam',
  CREATE_IP_POOL: 'create_ip_pool',
  EDIT_IP_POOL: 'edit_ip_pool',
  DELETE_IP_POOL: 'delete_ip_pool',
  ASSIGN_IP: 'assign_ip',
  RELEASE_IP: 'release_ip',
  SET_PTR: 'set_ptr',
  
  // Billing & Invoices
  VIEW_BILLING: 'view_billing',
  VIEW_INVOICES: 'view_invoices',
  CREATE_INVOICE: 'create_invoice',
  EDIT_INVOICE: 'edit_invoice',
  VOID_INVOICE: 'void_invoice',
  SEND_INVOICE: 'send_invoice',
  VIEW_TRANSACTIONS: 'view_transactions',
  CREDIT_WALLET: 'credit_wallet',
  DEBIT_WALLET: 'debit_wallet',
  VIEW_REPORTS: 'view_reports',
  
  // Payments
  VIEW_GATEWAYS: 'view_gateways',
  CONFIGURE_GATEWAYS: 'configure_gateways',
  
  // Support
  VIEW_TICKETS: 'view_tickets',
  REPLY_TICKET: 'reply_ticket',
  UPDATE_TICKET_STATUS: 'update_ticket_status',
  
  // SSH Keys
  VIEW_SSH_KEYS: 'view_ssh_keys',
  CREATE_SSH_KEY: 'create_ssh_key',
  DELETE_SSH_KEY: 'delete_ssh_key',
  
  // Settings
  VIEW_SETTINGS: 'view_settings',
  EDIT_SETTINGS: 'edit_settings',
  VIEW_ADMIN_USERS: 'view_admin_users',
  CREATE_ADMIN_USER: 'create_admin_user',
  EDIT_ADMIN_USER: 'edit_admin_user',
  DELETE_ADMIN_USER: 'delete_admin_user',
  
  // Logs
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  VIEW_SYSTEM_LOGS: 'view_system_logs',
}

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super: [
    // Full access to everything
    ...Object.values(PERMISSIONS),
  ],
  accountant: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_BILLING,
    PERMISSIONS.VIEW_INVOICES,
    PERMISSIONS.CREATE_INVOICE,
    PERMISSIONS.EDIT_INVOICE,
    PERMISSIONS.VOID_INVOICE,
    PERMISSIONS.SEND_INVOICE,
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.CREDIT_WALLET,
    PERMISSIONS.DEBIT_WALLET,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_GATEWAYS,
    PERMISSIONS.CONFIGURE_GATEWAYS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_SETTINGS,
  ],
  technical: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_VMS,
    PERMISSIONS.CREATE_VM,
    PERMISSIONS.EDIT_VM,
    PERMISSIONS.DELETE_VM,
    PERMISSIONS.START_VM,
    PERMISSIONS.STOP_VM,
    PERMISSIONS.RESTART_VM,
    PERMISSIONS.REBUILD_VM,
    PERMISSIONS.VIEW_INFRA,
    PERMISSIONS.VIEW_NODE_METRICS,
    PERMISSIONS.VIEW_IPAM,
    PERMISSIONS.ASSIGN_IP,
    PERMISSIONS.RELEASE_IP,
    PERMISSIONS.SET_PTR,
    PERMISSIONS.VIEW_SSH_KEYS,
    PERMISSIONS.CREATE_SSH_KEY,
    PERMISSIONS.DELETE_SSH_KEY,
    PERMISSIONS.VIEW_TICKETS,
    PERMISSIONS.REPLY_TICKET,
    PERMISSIONS.UPDATE_TICKET_STATUS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.VIEW_USERS,
  ],
  readonly: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_VMS,
    PERMISSIONS.VIEW_INFRA,
    PERMISSIONS.VIEW_IPAM,
    PERMISSIONS.VIEW_BILLING,
    PERMISSIONS.VIEW_INVOICES,
    PERMISSIONS.VIEW_TRANSACTIONS,
    PERMISSIONS.VIEW_TICKETS,
    PERMISSIONS.VIEW_SSH_KEYS,
    PERMISSIONS.VIEW_SETTINGS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
}