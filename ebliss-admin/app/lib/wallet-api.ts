// lib/api/wallet-api.ts
import { api } from './api'

export interface Transaction {
  id: number
  user_id: number
  user_email: string
  user_name: string
  type: 'credit' | 'debit'
  amount: number
  balance_after: number
  description: string
  ref_id: string | null
  metadata: any
  created_at: string
  admin_name?: string
}

export interface UserWallet {
  id: number
  email: string
  full_name: string
  balance: number
  status: 'active' | 'suspended'
  last_transaction: string | null
  vms_count: number
  verified: boolean
}

export interface WalletStats {
  total_balance: number
  total_credits: number
  total_debits: number
  active_users: number
  monthly_revenue: number
  growth_percentage: number
  pending_transactions: number
  avg_balance: number
}

export interface WalletSummary {
  balance: number
  total_credits: number
  total_debits: number
  monthly_spend: number
  monthly_topup: number
  last_transaction: Transaction | null
}

export interface PromoCode {
  id: number
  code: string
  discount_type: 'percentage' | 'fixed'
  value: number
  max_uses: number
  used_count: number
  expires_at: string
  created_at: string
  is_active: boolean
}

export const walletApi = {
  // Admin Stats
  async getAdminStats(): Promise<WalletStats> {
    const response = await api.get('/wallet/admin/stats')
    return response.data
  },

  // Admin Transactions
  async getAdminTransactions(params?: {
    page?: number
    limit?: number
    type?: 'credit' | 'debit'
    user_id?: number
    search?: string
  }): Promise<{ data: Transaction[]; total: number; page: number; totalPages: number }> {
    const response = await api.get('/wallet/admin/transactions', { params })
    return response.data
  },

  // Admin Users Wallets
  async getAdminUsers(params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    min_balance?: number
  }): Promise<{ data: UserWallet[]; total: number; page: number; totalPages: number }> {
    const response = await api.get('/wallet/admin/users', { params })
    return response.data
  },

  // Admin Credit User
  async adminCredit(userId: number, amount: number, description: string): Promise<any> {
    const response = await api.post(`/wallet/admin/credit/${userId}`, { amount, description })
    return response.data
  },

  // Admin Debit User
  async adminDebit(userId: number, amount: number, description: string): Promise<any> {
    const response = await api.post(`/wallet/admin/debit/${userId}`, { amount, description })
    return response.data
  },

  // Admin Promo Codes
  async getPromoCodes(): Promise<PromoCode[]> {
    const response = await api.get('/wallet/admin/promos')
    return response.data
  },

  async createPromoCode(data: {
    code: string
    discount_type: 'percentage' | 'fixed'
    value: number
    max_uses?: number
    expires_at?: string
  }): Promise<PromoCode> {
    const response = await api.post('/wallet/admin/promos', data)
    return response.data
  },

  async deletePromoCode(id: number): Promise<void> {
    await api.delete(`/wallet/admin/promos/${id}`)
  },
   async sendAlert(userId: number, subject: string, message: string): Promise<any> {
    const response = await api.post(`/wallet/admin/users/${userId}/alert`, { subject, message })
    return response.data
  },

  // Balance History
  async getBalanceHistory(userId: number, days?: number): Promise<any> {
    const response = await api.get(`/wallet/admin/users/${userId}/balance-history`, { params: { days } })
    return response.data
  },

  // Monthly Statement
  async getMonthlyStatement(userId: number, year: number, month: number): Promise<any> {
    const response = await api.get(`/wallet/admin/users/${userId}/monthly-statement`, { params: { year, month } })
    return response.data
  },
}