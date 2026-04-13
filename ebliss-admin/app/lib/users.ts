import api from './api';

export interface User {
  id: number;
  email: string;
  full_name?: string;
  name?: string;
  role: string;
  wallet_balance: string;
  verified: boolean;
  created_at: string;
  phone?: string | null;
  company?: string | null;
  tax_id?: string | null;
  address?: any;
  status: string;
  _count?: {
    vms: number;
    invoices: number;
  };
}

export interface UsersResponse {
  data: User[];
  total: number;
}

// Get all users
export const getUsers = async (params?: {
  skip?: number;
  take?: number;
  search?: string;
}): Promise<{ users: User[]; total: number }> => {
  const response = await api.get('/users', { params });
  
  // Handle the actual API response structure
  const responseData = response.data as UsersResponse;
  
  return {
    users: responseData.data || [],
    total: responseData.total || 0,
  };
};

// Get single user
export const getUser = async (id: number): Promise<User> => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

// Create user
export const createUser = async (data: Partial<User>): Promise<User> => {
  const response = await api.post('/users', data);
  return response.data;
};

// Update user
export const updateUser = async (id: number, data: Partial<User>): Promise<User> => {
  const response = await api.patch(`/users/${id}`, data);
  return response.data;
};

// Delete user
export const deleteUser = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};