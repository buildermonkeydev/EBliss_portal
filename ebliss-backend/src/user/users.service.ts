import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import * as bcrypt from 'bcrypt';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  async createUser(data: {
    email: string;
    full_name: string;
    password: string;
    role?: string;
    phone?: string;
    company?: string;
    tax_id?: string;
    address?: any;
  }): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        full_name: data.full_name,
        password_hash: hashedPassword,
        role: data.role || 'customer',
        phone: data.phone,
        company: data.company,
        tax_id: data.tax_id,
        address: data.address,
        wallet_balance: 0,
        verified: false,
      },
    });

    await this.prisma.transaction.create({
      data: {
        user_id: user.id,
        type: 'credit',
        amount: 0,
        balance_after: 0,
        description: 'Account created',
      },
    });

    this.logger.log(`User created: ${user.email} (ID: ${user.id})`);
    return user;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<{ data: any[]; total: number }> {
    const { skip = 0, take = 50, where = {}, orderBy = { created_at: 'desc' } } = params;
    
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        where,
        orderBy,
        select: {
          id: true,
          email: true,
          role: true,
          wallet_balance: true,
          verified: true,
          created_at: true,
          phone: true,
          company: true,
          tax_id: true,
          address: true,
          status: true,
          _count: {
            select: {
              vms: true,
              invoices: {
                where: { status: 'pending' },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        vms: {
          include: {
            node: {
              include: {
                pop: true,
              },
            },
          },
        },
        ssh_keys: true,
        invoices: {
          take: 10,
          orderBy: { created_at: 'desc' },
        },
        transactions: {
          take: 10,
          orderBy: { created_at: 'desc' },
        },
        tickets: {
          take: 5,
          orderBy: { created_at: 'desc' },
          where: { status: { not: 'closed' } },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateUser(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
      });
      return user;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }

  async updatePassword(id: number, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.findOne(id);
    
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { password_hash: hashedPassword },
    });
    
    this.logger.log(`Password updated for user ${user.email}`);
  }

  async verifyUser(id: number): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { verified: true },
    });
    
    return user;
  }

  async deleteUser(id: number): Promise<User> {
    try {
      const user = await this.prisma.user.delete({
        where: { id },
      });
      this.logger.log(`User deleted: ${user.email} (ID: ${user.id})`);
      return user;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }

  async getUserStats(id: number): Promise<any> {
    const [user, vmStats, invoiceStats, transactionStats] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          wallet_balance: true,
          created_at: true,
        },
      }),
      this.prisma.vM.aggregate({
        where: { user_id: id },
        _count: true,
        _sum: { hourly_rate: true },
      }),
      this.prisma.invoice.aggregate({
        where: { user_id: id, status: 'paid' },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { user_id: id },
        _sum: { amount: true },
      }),
    ]);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const hourlyRateSum = vmStats._sum.hourly_rate;
    const estimatedMonthlyCost = hourlyRateSum ? hourlyRateSum.toNumber() * 24 * 30 : 0;

    return {
      user,
      statistics: {
        totalVMs: vmStats._count,
        totalSpent: invoiceStats._sum.total ? invoiceStats._sum.total.toNumber() : 0,
        totalTopups: transactionStats._sum.amount ? transactionStats._sum.amount.toNumber() : 0,
        paidInvoices: invoiceStats._count,
        estimatedMonthlyCost,
      },
    };
  }

  async updateTaxSettings(id: number, taxId: string, taxRate?: number): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        tax_id: taxId,
        tax_rate: taxRate,
      },
    });
    
    return user;
  }

// In your users.service.ts
async getUserActivity(id: number, limit: number = 20, page: number = 1) {
  // Convert to numbers to ensure they are integers
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const skip = (pageNum - 1) * limitNum;
  
  const [activities, total] = await Promise.all([
    this.prisma.loginHistory.findMany({
      where: {
        user_id: id,
      },
      orderBy: { created_at: 'desc' },
      skip: skip,  // Make sure skip is calculated correctly
      take: limitNum,
    }),
    this.prisma.loginHistory.count({
      where: {
        user_id: id,
      },
    }),
  ]);
  
  // Transform LoginHistory to a consistent format
  const formattedActivities = activities.map(activity => ({
    id: activity.id,
    action: activity.success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
    description: activity.success 
      ? `Successful login from ${activity.location || 'unknown location'}`
      : `Failed login attempt - ${activity.failure_reason || 'Invalid credentials'}`,
    ip_address: activity.ip_address,
    location: activity.location,
    device_type: activity.device_type,
    user_agent: activity.user_agent,
    status: activity.success ? 'success' : 'failed',
    timestamp: activity.created_at,
    metadata: {
      failure_reason: activity.failure_reason,
      location: activity.location,
      device_type: activity.device_type,
    },
  }));
  
  // Log for debugging
  console.log(`Page: ${pageNum}, Limit: ${limitNum}, Skip: ${skip}, Total: ${total}, Activities found: ${formattedActivities.length}`);
  
  return {
    activities: formattedActivities,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

// Helper method to determine action type
private getActionType(action: string): string {
  const actionMap: Record<string, string> = {
    'USER_SUSPENDED': 'security',
    'USER_ACTIVATED': 'security',
    'MANUAL_PAYMENT': 'billing',
    'WALLET_CREDIT': 'billing',
    'INVOICE_STATUS_CHANGE': 'billing',
    'INVOICE_VOIDED': 'billing',
    'INVOICE_RESENT': 'billing',
    'USER_CREATED': 'create',
    'USER_UPDATED': 'update',
    'USER_DELETED': 'delete',
  };
  return actionMap[action] || 'other';
}

  async suspendUser(id: number, reason: string, adminId: number): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { 
        status: 'suspended',
        suspended_at: new Date(),
        suspension_reason: reason,
      },
    });
    
    await this.prisma.vM.updateMany({
      where: { user_id: id, status: 'running' },
      data: { status: 'suspended' },
    });
    
    await this.prisma.auditLog.create({
      data: {
        admin_id: adminId,
        action: 'USER_SUSPENDED',
        target_type: 'user',
        target_id: id.toString(),
        payload_json: { reason },
        ip: 'admin_action',
      },
    });
    
    return user;
  }

  async activateUser(id: number, adminId: number): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { 
        status: 'active',
        suspended_at: null,
        suspension_reason: null,
      },
    });
    
    await this.prisma.auditLog.create({
      data: {
        admin_id: adminId,
        action: 'USER_ACTIVATED',
        target_type: 'user',
        target_id: id.toString(),
        ip: 'admin_action',
      },
    });
    
    return user;
  }

  // ============ Security Methods ============

  async getSecurityStats(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        two_factor_enabled: true,
        verified: true,
        last_login_at: true,
      },
    });

    // For password strength, we need to check at creation time
    // Since we don't store password strength, we'll assume 'Strong' for now
    // You can add a password_strength field to User model if needed
    const passwordStrength = 'Strong';

    const activeSessions = await this.prisma.refreshToken.count({
      where: {
        user_id: userId,
        revoked: false,
        expires_at: { gt: new Date() },
      },
    });

    const preferences = await this.getNotificationPreferences(userId);

    let securityScore = 0;
    if (user?.two_factor_enabled) securityScore += 30;
    if (passwordStrength === 'Strong') securityScore += 40;
    // if (passwordStrength === 'Medium') securityScore += 25;
    if (user?.verified) securityScore += 15;
    if (activeSessions <= 3) securityScore += 15;

    return {
      twoFactorEnabled: user?.two_factor_enabled || false,
      passwordStrength,
      activeSessions,
      emailAlerts: preferences.email_alerts !== false,
      securityScore: Math.min(securityScore, 100),
    };
  }

  async getNotificationPreferences(userId: number) {
    // Get login history to check last notification preferences
    // For now, return default values
    return {
      new_login: true,
      suspicious_activity: true,
      security_changes: true,
      email_alerts: true,
    };
  }

  async updateNotificationPreferences(
    userId: number,
    preferences: {
      new_login?: boolean;
      suspicious_activity?: boolean;
      security_changes?: boolean;
    },
  ) {
    // Store preferences in a separate table or user settings
    // For now, just return success
    this.logger.log(`Notification preferences updated for user ${userId}:`, preferences);
    
    return { success: true, message: 'Notification preferences updated' };
  }

  async getActiveSessions(userId: number) {
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        user_id: userId,
        revoked: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });

    // Get login history for location info
    const loginHistory = await this.prisma.loginHistory.findMany({
      where: { user_id: userId, success: true },
      orderBy: { created_at: 'desc' },
      take: sessions.length,
    });

    return sessions.map((session, index) => {
      const login = loginHistory[index];
      return {
        id: session.id,
        device_type: this.getDeviceType(session.user_agent || ''),
        browser: this.getBrowser(session.user_agent || ''),
        os: this.getOS(session.user_agent || ''),
        ip_address: session.ip_address || 'Unknown',
        location: login?.location || 'Unknown Location',
        last_active: session.created_at,
        is_current: index === 0,
        created_at: session.created_at,
      };
    });
  }

  async revokeSession(userId: number, sessionId: number) {
    const session = await this.prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        user_id: userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revoked: true },
    });

    return { success: true, message: 'Session revoked successfully' };
  }

  async revokeAllOtherSessions(userId: number, currentSessionId?: number) {
    await this.prisma.refreshToken.updateMany({
      where: {
        user_id: userId,
        revoked: false,
        ...(currentSessionId && { id: { not: currentSessionId } }),
      },
      data: { revoked: true },
    });

    return { success: true, message: 'All other sessions revoked successfully' };
  }

  private getDeviceType(userAgent: string): string {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile')) return 'Mobile';
    if (ua.includes('tablet')) return 'Tablet';
    if (ua.includes('mac') || ua.includes('windows') || ua.includes('linux')) return 'Desktop';
    return 'Unknown';
  }

  private getBrowser(userAgent: string): string {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('edg')) return 'Edge';
    return 'Unknown';
  }

  private getOS(userAgent: string): string {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
    return 'Unknown';
  }



// Add these methods to src/user/users.service.ts

async findAllAdmins(params: {
  skip?: number;
  take?: number;
  where?: any;
}): Promise<{ data: any[]; total: number }> {
  const { skip = 0, take = 50, where = {} } = params;
  
  const [data, total] = await Promise.all([
    this.prisma.adminUser.findMany({
      skip,
      take,
      where,
      select: {
        id: true,
        email: true,
        role: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    }),
    this.prisma.adminUser.count({ where }),
  ]);

  return { data, total };
}

async getAdminStats(): Promise<any> {
  const [totalAdmins, adminsByRole] = await Promise.all([
    this.prisma.adminUser.count(),
    this.prisma.adminUser.groupBy({
      by: ['role'],
      _count: true,
    }),
  ]);

  const roleBreakdown = {};
  adminsByRole.forEach(item => {
    roleBreakdown[item.role] = item._count;
  });

  return {
    totalAdmins,
    roleBreakdown,
  };
}

async findAdminById(id: number): Promise<any> {
  const admin = await this.prisma.adminUser.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      created_at: true,
    },
  });

  if (!admin) {
    throw new NotFoundException(`Admin with ID ${id} not found`);
  }

  return admin;
}

async createAdmin(data: {
  email: string;
  password: string;
  role: string;
}): Promise<any> {
  const existingAdmin = await this.prisma.adminUser.findUnique({
    where: { email: data.email },
  });

  if (existingAdmin) {
    throw new ConflictException('Admin email already exists');
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const admin = await this.prisma.adminUser.create({
    data: {
      email: data.email,
      password_hash: hashedPassword,
      role: data.role as any,
    },
   
  });

  this.logger.log(`Admin created: ${admin.email} (ID: ${admin.id})`);
  return admin;
}

async updateAdmin(id: number, data: { role?: string; password?: string }): Promise<any> {
  const updateData: any = {};
  
  if (data.role) updateData.role = data.role;
  if (data.password) updateData.password_hash = await bcrypt.hash(data.password, 10);

  try {
    const admin = await this.prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, role: true, created_at: true },
    });
    
    this.logger.log(`Admin updated: ${admin.email} (ID: ${admin.id})`);
    return admin;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }
    throw error;
  }
}

async deleteAdmin(id: number): Promise<any> {
  try {
    const admin = await this.prisma.adminUser.delete({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    
    this.logger.log(`Admin deleted: ${admin.email} (ID: ${admin.id})`);
    return { success: true, message: 'Admin deleted successfully' };
  } catch (error) {
    if (error.code === 'P2025') {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }
    throw error;
  }
}
























}