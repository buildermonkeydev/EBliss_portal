// contexts/AuthContext.tsx

"use client"
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/lib/api/auth';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  verified: boolean;
  company?: string;
  tax_id?: string;
  state?: string;
  wallet_balance: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from token
    const loadUser = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          // Decode JWT or fetch user data
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser({
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            role: payload.role,
            verified: payload.verified,
            wallet_balance: payload.wallet_balance || 0,
          });
        } catch (error) {
          console.error('Failed to load user:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    const response = await authAPI.login({ email, password, remember_me: rememberMe });
    const { access_token, refresh_token, user: userData } = response.data;
    
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    setUser(userData);
  };

  const register = async (data: any) => {
    await authAPI.register(data);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token') ?? undefined;
    try {
      await authAPI.logout(refreshToken) ;
    } catch (error) {

      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  const verifyEmail = async (token: string) => {
    await authAPI.verifyEmail(token);
    // Update user verification status
    if (user) {
      setUser({ ...user, verified: true });
    }
  };

  const resendVerification = async (email: string) => {
    await authAPI.resendVerification(email);
  };

  const forgotPassword = async (email: string) => {
    await authAPI.forgotPassword(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    await authAPI.resetPassword(token, newPassword);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authAPI.changePassword(currentPassword, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        verifyEmail,
        resendVerification,
        forgotPassword,
        resetPassword,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};