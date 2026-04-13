import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityLogDto, QueryActivityLogsDto, ActivityType, ServiceType, ActivityStatus } from './dto/activity-log.dto';

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateActivityLogDto) {
    try {
      return await this.prisma.activityLog.create({
        data: {
          user_id: userId,
          action: dto.action,
          action_type: dto.action_type,
          description: dto.description,
          service_type: dto.service_type,
          service_name: dto.service_name,
          ip_address: dto.ip_address,
          user_agent: dto.user_agent,
          status: dto.status,
          metadata: dto.metadata || {},
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create activity log: ${error.message}`);
      throw error;
    }
  }

  async findAll(userId: number, query: QueryActivityLogsDto) {
    // Ensure page and limit are numbers
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { search, service_type, status, date_range, start_date, end_date } = query;
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: any = { user_id: userId };
    
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { service_name: { contains: search, mode: 'insensitive' } },
        { ip_address: { contains: search } },
      ];
    }
    
    // Handle service_type filter
    if (service_type && service_type !== ('all' as any)) {
      const validServiceTypes = Object.values(ServiceType);
      if (validServiceTypes.includes(service_type as ServiceType)) {
        where.service_type = service_type as ServiceType;
      }
    }
    
    // Handle status filter
    if (status && status !== ('all' as any)) {
      const validStatuses = Object.values(ActivityStatus);
      if (validStatuses.includes(status as ActivityStatus)) {
        where.status = status as ActivityStatus;
      }
    }
    
    // Date range filtering
    if (date_range && date_range !== 'all') {
      const now = new Date();
      let startDate: Date | undefined;
      
      switch (date_range) {
        case 'today':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          startDate = undefined;
      }
      
      if (startDate) {
        where.created_at = { gte: startDate };
      }
    } else if (start_date && end_date) {
      where.created_at = {
        gte: new Date(start_date),
        lte: new Date(end_date),
      };
    }
    
    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit, // Now limit is a number
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.activityLog.count({ where }),
    ]);
    
    // Calculate statistics
    const stats = await this.getStats(userId, where);
    
    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    };
  }

  async getStats(userId: number, baseWhere: any = {}) {
    const where = { ...baseWhere, user_id: userId };
    
    const [total, success, failed, warning, vps, firewall, ssh, billing, account] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.count({ where: { ...where, status: ActivityStatus.SUCCESS } }),
      this.prisma.activityLog.count({ where: { ...where, status: ActivityStatus.FAILED } }),
      this.prisma.activityLog.count({ where: { ...where, status: ActivityStatus.WARNING } }),
      this.prisma.activityLog.count({ where: { ...where, service_type: ServiceType.VPS } }),
      this.prisma.activityLog.count({ where: { ...where, service_type: ServiceType.FIREWALL } }),
      this.prisma.activityLog.count({ where: { ...where, service_type: ServiceType.SSH } }),
      this.prisma.activityLog.count({ where: { ...where, service_type: ServiceType.BILLING } }),
      this.prisma.activityLog.count({ where: { ...where, service_type: ServiceType.ACCOUNT } }),
    ]);
    
    return {
      total,
      success,
      failed,
      warning,
      vps,
      firewall,
      ssh,
      billing,
      account,
    };
  }

  async getUserActivitySummary(userId: number) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [totalLogs, lastLogin, mostActiveDayResult, actionCounts] = await Promise.all([
      this.prisma.activityLog.count({
        where: { user_id: userId, created_at: { gte: thirtyDaysAgo } },
      }),
      this.prisma.activityLog.findFirst({
        where: { user_id: userId, action_type: ActivityType.SIGN_IN, status: ActivityStatus.SUCCESS },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.$queryRaw<any[]>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM activity_logs
        WHERE user_id = ${userId}
        GROUP BY DATE(created_at)
        ORDER BY count DESC
        LIMIT 1
      `,
      this.prisma.activityLog.groupBy({
        by: ['action_type'],
        where: { user_id: userId, created_at: { gte: thirtyDaysAgo } },
        _count: { action_type: true },
      }),
    ]);
    
    return {
      total_30_days: totalLogs,
      last_login: lastLogin?.created_at || null,
      most_active_day: mostActiveDayResult && mostActiveDayResult[0] ? mostActiveDayResult[0] : null,
      action_breakdown: actionCounts,
    };
  }

  async exportLogs(userId: number, query: QueryActivityLogsDto) {
    const { search, service_type, status, date_range } = query;
    
    const where: any = { user_id: userId };
    
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    // Handle service_type filter
    if (service_type && service_type !== ('all' as any)) {
      const validServiceTypes = Object.values(ServiceType);
      if (validServiceTypes.includes(service_type as ServiceType)) {
        where.service_type = service_type as ServiceType;
      }
    }
    
    // Handle status filter
    if (status && status !== ('all' as any)) {
      const validStatuses = Object.values(ActivityStatus);
      if (validStatuses.includes(status as ActivityStatus)) {
        where.status = status as ActivityStatus;
      }
    }
    
    if (date_range && date_range !== 'all') {
      const now = new Date();
      let startDate: Date | undefined;
      
      switch (date_range) {
        case 'today':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          startDate = undefined;
      }
      
      if (startDate) {
        where.created_at = { gte: startDate };
      }
    }
    
    return this.prisma.activityLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  async logUserAction(
    userId: number,
    action: string,
    actionType: ActivityType,
    description: string,
    serviceType: ServiceType,
    status: ActivityStatus,
    options?: {
      serviceName?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    },
  ) {
    return this.create(userId, {
      action,
      action_type: actionType,
      description,
      service_type: serviceType,
      service_name: options?.serviceName,
      ip_address: options?.ipAddress,
      user_agent: options?.userAgent,
      status,
      metadata: options?.metadata,
    });
  }
}