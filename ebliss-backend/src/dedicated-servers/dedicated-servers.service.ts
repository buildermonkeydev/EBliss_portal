import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../auth/services/email.service';
import { CreateDedicatedServerDto } from './dto/create-server.dto';
import { UpdateDedicatedServerDto } from './dto/update-server.dto';
import { AssignServerDto } from './dto/assign-server.dto';
import { ServerStatus, ProvisioningStatus } from '@prisma/client';

@Injectable()
export class DedicatedServersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // ============================================
  // CRUD Operations
  // ============================================

  async create(createDto: CreateDedicatedServerDto) {
    // Check if hostname already exists
    const existing = await this.prisma.dedicatedServer.findUnique({
      where: { hostname: createDto.hostname },
    });

    if (existing) {
      throw new ConflictException('Server with this hostname already exists');
    }

    // Check rack position availability
    if (createDto.rack_id && createDto.rack_position) {
      const rackOccupied = await this.prisma.dedicatedServer.findFirst({
        where: {
          datacenter: createDto.datacenter,
          rack_id: createDto.rack_id,
          rack_position: createDto.rack_position,
        },
      });

      if (rackOccupied) {
        throw new ConflictException('Rack position is already occupied');
      }
    }

    // Create server
    const server = await this.prisma.dedicatedServer.create({
      data: {
        name: createDto.name,
        hostname: createDto.hostname,
        user_id: createDto.user_id,
        cpu_model: createDto.cpu_model,
        cpu_cores: createDto.cpu_cores,
        cpu_threads: createDto.cpu_threads,
        cpu_speed: createDto.cpu_speed,
        ram_gb: createDto.ram_gb,
        ram_type: createDto.ram_type || 'DDR4',
        ram_speed: createDto.ram_speed,
        network_port: createDto.network_port || '1 Gbps',
        bandwidth_tb: createDto.bandwidth_tb || 10,
        ipv4_count: createDto.ipv4_count || 1,
        ipv6_count: createDto.ipv6_count || 0,
        datacenter: createDto.datacenter,
        rack_id: createDto.rack_id,
        rack_position: createDto.rack_position,
        os: createDto.os,
        os_version: createDto.os_version,
        root_password: createDto.root_password,
        monthly_price: createDto.monthly_price,
        setup_fee: createDto.setup_fee || 0,
        ddos_protection: createDto.ddos_protection || false,
        backup_enabled: createDto.backup_enabled || false,
        monitoring_enabled: createDto.monitoring_enabled ?? true,
        ipmi_ip: createDto.ipmi_ip,
        ipmi_user: createDto.ipmi_user,
        ipmi_password: createDto.ipmi_password,
        kvm_enabled: createDto.kvm_enabled || false,
        kvm_type: createDto.kvm_type,
        notes: createDto.notes,
        tags: createDto.tags || [],
        status: ServerStatus.pending,
        provisioning_status: ProvisioningStatus.pending,
        storage: {
          create: createDto.storage.map((s, index) => ({
            type: s.type,
            size_gb: s.size_gb,
            raid_level: s.raid_level,
            drive_count: s.drive_count || 1,
            is_primary: s.is_primary ?? index === 0,
          })),
        },
      },
      include: {
        storage: true,
        assigned_to: {
          select: { id: true, full_name: true, email: true, company: true },
        },
      },
    });

    // Log server creation
    await this.logServerEvent(server.id, 'system', 'info', `Server ${server.name} created`);

    return server;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    status?: ServerStatus;
    datacenter?: string;
    userId?: number;
    search?: string;
  }) {
    const { skip = 0, take = 20, status, datacenter, userId, search } = params;

    const where: any = {};

    if (status) where.status = status;
    if (datacenter) where.datacenter = datacenter;
    if (userId) where.user_id = userId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { hostname: { contains: search, mode: 'insensitive' } },
        { datacenter: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [servers, total] = await Promise.all([
      this.prisma.dedicatedServer.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          storage: true,
          assigned_to: {
            select: { id: true, full_name: true, email: true, company: true },
          },
          ip_addresses: true,
        },
      }),
      this.prisma.dedicatedServer.count({ where }),
    ]);

    return { servers, total };
  }

  async findOne(id: string) {
    const server = await this.prisma.dedicatedServer.findUnique({
      where: { id },
      include: {
        storage: true,
        assigned_to: {
          select: { id: true, full_name: true, email: true, company: true, phone: true },
        },
        ip_addresses: true,
        bandwidth_usage: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        power_usage: {
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
        server_logs: {
          orderBy: { created_at: 'desc' },
          take: 50,
        },
        maintenance_windows: {
          where: { status: { in: ['scheduled', 'in_progress'] } },
          orderBy: { start_at: 'asc' },
        },
      },
    });

    if (!server) {
      throw new NotFoundException('Dedicated server not found');
    }

    return server;
  }

  async update(id: string, updateDto: UpdateDedicatedServerDto) {
    await this.findOne(id); // Check existence

    const server = await this.prisma.dedicatedServer.update({
      where: { id },
      data: {
        name: updateDto.name,
        hostname: updateDto.hostname,
        cpu_model: updateDto.cpu_model,
        cpu_cores: updateDto.cpu_cores,
        cpu_threads: updateDto.cpu_threads,
        cpu_speed: updateDto.cpu_speed,
        ram_gb: updateDto.ram_gb,
        ram_type: updateDto.ram_type,
        ram_speed: updateDto.ram_speed,
        network_port: updateDto.network_port,
        bandwidth_tb: updateDto.bandwidth_tb,
        ipv4_count: updateDto.ipv4_count,
        ipv6_count: updateDto.ipv6_count,
        datacenter: updateDto.datacenter,
        rack_id: updateDto.rack_id,
        rack_position: updateDto.rack_position,
        os: updateDto.os,
        os_version: updateDto.os_version,
        root_password: updateDto.root_password,
        monthly_price: updateDto.monthly_price,
        setup_fee: updateDto.setup_fee,
        ddos_protection: updateDto.ddos_protection,
        backup_enabled: updateDto.backup_enabled,
        monitoring_enabled: updateDto.monitoring_enabled,
        ipmi_ip: updateDto.ipmi_ip,
        ipmi_user: updateDto.ipmi_user,
        ipmi_password: updateDto.ipmi_password,
        kvm_enabled: updateDto.kvm_enabled,
        kvm_type: updateDto.kvm_type,
        notes: updateDto.notes,
        tags: updateDto.tags,
      },
      include: {
        storage: true,
        assigned_to: { select: { id: true, full_name: true, email: true } },
      },
    });

    await this.logServerEvent(id, 'system', 'info', `Server ${server.name} updated`);

    return server;
  }

  async remove(id: string) {
    const server = await this.findOne(id);

    if (server.status === ServerStatus.online) {
      throw new BadRequestException('Cannot delete an online server. Please shut it down first.');
    }

    await this.prisma.dedicatedServer.delete({ where: { id } });

    return { message: 'Server deleted successfully' };
  }

  // ============================================
  // Server Assignment
  // ============================================

  async assignToUser(id: string, assignDto: AssignServerDto) {
    const server = await this.findOne(id);

    if (server.user_id) {
      throw new BadRequestException('Server is already assigned to a user');
    }

    if (server.status !== ServerStatus.online && server.status !== ServerStatus.pending) {
      throw new BadRequestException('Server is not available for assignment');
    }

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: assignDto.user_id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedServer = await this.prisma.dedicatedServer.update({
      where: { id },
      data: {
        user_id: assignDto.user_id,
        contract_start: assignDto.contract_start ? new Date(assignDto.contract_start) : new Date(),
        contract_end: assignDto.contract_end ? new Date(assignDto.contract_end) : null,
        auto_renew: assignDto.auto_renew ?? true,
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: assignDto.notes || server.notes,
      },
      include: {
        assigned_to: { select: { id: true, full_name: true, email: true } },
      },
    });

    await this.logServerEvent(id, 'user_action', 'info', `Server assigned to user ${user.email}`);

    // Send email notification
    if (user.email) {
      await this.emailService.sendServerAssignedEmail(user.email, server.name, user.full_name);
    }

    return updatedServer;
  }

  async unassignServer(id: string) {
    const server = await this.findOne(id);

    if (!server.user_id) {
      throw new BadRequestException('Server is not assigned to any user');
    }

    const updatedServer = await this.prisma.dedicatedServer.update({
      where: { id },
      data: {
        user_id: null,
        contract_start: null,
        contract_end: null,
        next_billing_date: null,
      },
    });

    await this.logServerEvent(id, 'user_action', 'info', 'Server unassigned from user');

    return updatedServer;
  }

  // ============================================
  // Server Status Management
  // ============================================

  async updateStatus(id: string, status: ServerStatus, reason?: string) {
    const server = await this.findOne(id);

    const updatedServer = await this.prisma.dedicatedServer.update({
      where: { id },
      data: {
        status,
        ...(status === ServerStatus.online && { last_boot_at: new Date() }),
        ...(status === ServerStatus.suspended && { suspended_at: new Date() }),
      },
    });

    await this.logServerEvent(
      id,
      'system',
      status === ServerStatus.online ? 'info' : 'warning',
      `Server status changed to ${status}${reason ? `: ${reason}` : ''}`,
    );

    // Notify user if assigned
    if (server.user_id && server.assigned_to?.email) {
      await this.emailService.sendServerStatusChangeEmail(
        server.assigned_to.email,
        server.name,
        status,
      );
    }

    return updatedServer;
  }

  async updateProvisioningStatus(id: string, status: ProvisioningStatus) {
    await this.findOne(id);

    const server = await this.prisma.dedicatedServer.update({
      where: { id },
      data: {
        provisioning_status: status,
        ...(status === ProvisioningStatus.completed && { provisioned_at: new Date() }),
      },
    });

    await this.logServerEvent(id, 'system', 'info', `Provisioning status changed to ${status}`);

    return server;
  }

  async reboot(id: string) {
    const server = await this.findOne(id);

    if (server.status !== ServerStatus.online) {
      throw new BadRequestException('Server must be online to reboot');
    }

    await this.prisma.dedicatedServer.update({
      where: { id },
      data: { status: ServerStatus.pending },
    });

    await this.logServerEvent(id, 'user_action', 'warning', 'Server reboot initiated');

    // Here you would trigger actual reboot via IPMI/API
    // Simulate reboot completion
    setTimeout(async () => {
      await this.prisma.dedicatedServer.update({
        where: { id },
        data: { status: ServerStatus.online, last_boot_at: new Date() },
      });
      await this.logServerEvent(id, 'system', 'info', 'Server reboot completed');
    }, 60000);

    return { message: 'Server reboot initiated' };
  }

  // ============================================
  // Bandwidth & Monitoring
  // ============================================

  async getBandwidthStats(id: string, days: number = 30) {
    const server = await this.findOne(id);

    const stats = await this.prisma.bandwidthUsage.findMany({
      where: {
        server_id: id,
        date: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      },
      orderBy: { date: 'asc' },
    });

    const total = stats.reduce(
      (acc, curr) => ({
        in_gb: acc.in_gb + curr.in_gb,
        out_gb: acc.out_gb + curr.out_gb,
        total_gb: acc.total_gb + curr.total_gb,
      }),
      { in_gb: 0, out_gb: 0, total_gb: 0 },
    );

    return {
      server: { id: server.id, name: server.name },
      period_days: days,
      daily_stats: stats,
      totals: total,
      limit_tb: server.bandwidth_tb,
      usage_percent: (total.total_gb / (server.bandwidth_tb * 1024)) * 100,
    };
  }

  async recordBandwidthUsage(id: string, in_gb: number, out_gb: number) {
    const server = await this.findOne(id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await this.prisma.bandwidthUsage.upsert({
      where: {
        server_id_date: { server_id: id, date: today },
      },
      update: {
        in_gb: { increment: in_gb },
        out_gb: { increment: out_gb },
        total_gb: { increment: in_gb + out_gb },
      },
      create: {
        server_id: id,
        date: today,
        in_gb,
        out_gb,
        total_gb: in_gb + out_gb,
      },
    });

    // Update server's total bandwidth used
    await this.prisma.dedicatedServer.update({
      where: { id },
      data: {
        bandwidth_used_in_gb: { increment: in_gb },
        bandwidth_used_out_gb: { increment: out_gb },
      },
    });

    // Check if approaching limit
    const totalUsed = (server.bandwidth_used_in_gb || 0) + (server.bandwidth_used_out_gb || 0);
    const limitGB = server.bandwidth_tb * 1024;
    const usagePercent = (totalUsed / limitGB) * 100;

    if (usagePercent >= 90 && server.user_id) {
      await this.logServerEvent(id, 'monitoring', 'warning', `Bandwidth usage at ${usagePercent.toFixed(1)}%`);
    }

    return usage;
  }

  async recordPowerUsage(id: string, power_watts: number, voltage?: number, current_amps?: number) {
    await this.findOne(id);

    const usage = await this.prisma.powerUsage.create({
      data: {
        server_id: id,
        power_watts,
        voltage,
        current_amps,
      },
    });

    return usage;
  }

  // ============================================
  // Maintenance Windows
  // ============================================

  async scheduleMaintenance(id: string, data: { title: string; description?: string; start_at: Date; end_at: Date; created_by: number }) {
    const server = await this.findOne(id);

    const window = await this.prisma.maintenanceWindow.create({
      data: {
        server_id: id,
        title: data.title,
        description: data.description,
        start_at: data.start_at,
        end_at: data.end_at,
        created_by: data.created_by,
      },
    });

    await this.prisma.dedicatedServer.update({
      where: { id },
      data: { status: ServerStatus.maintenance },
    });

    await this.logServerEvent(id, 'system', 'warning', `Maintenance scheduled: ${data.title}`);

    // Notify user if assigned
    if (server.user_id && server.assigned_to?.email) {
      await this.emailService.sendMaintenanceNotificationEmail(
        server.assigned_to.email,
        server.name,
        data,
      );
    }

    return window;
  }

  // ============================================
  // Server Logs
  // ============================================

  async getServerLogs(id: string, limit: number = 100, logType?: string) {
    const where: any = { server_id: id };
    if (logType) where.log_type = logType;

    return this.prisma.serverLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  private async logServerEvent(
    serverId: string,
    logType: string,
    severity: string,
    message: string,
    details?: any,
  ) {
    return this.prisma.serverLog.create({
      data: {
        server_id: serverId,
        log_type: logType as any,
        severity: severity as any,
        message,
        details,
      },
    });
  }

  // ============================================
  // Statistics & Reports
  // ============================================

  async getStatistics() {
    const [total, byStatus, byDatacenter, totalRevenue] = await Promise.all([
      this.prisma.dedicatedServer.count(),
      this.prisma.dedicatedServer.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.dedicatedServer.groupBy({
        by: ['datacenter'],
        _count: true,
      }),
      this.prisma.dedicatedServer.aggregate({
        where: { user_id: { not: null } },
        _sum: { monthly_price: true },
      }),
    ]);

    return {
      total_servers: total,
      by_status: byStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {}),
      by_datacenter: byDatacenter.reduce((acc, curr) => {
        acc[curr.datacenter] = curr._count;
        return acc;
      }, {}),
      monthly_revenue: totalRevenue._sum.monthly_price || 0,
    };
  }

  async getAvailableRacks(datacenter?: string) {
    const where: any = {};
    if (datacenter) where.datacenter = datacenter;

    const racks = await this.prisma.rack.findMany({
      where,
      include: {
        devices: true,
      },
    });

    return racks.map(rack => ({
      ...rack,
      available_positions: this.getAvailableRackPositions(rack),
    }));
  }

  private getAvailableRackPositions(rack: any): number[] {
    const occupied = new Set<number>();
    
    rack.devices.forEach((device: any) => {
      for (let i = 0; i < device.size_u; i++) {
        occupied.add(device.position + i);
      }
    });

    const available: number[] = [];
    for (let u = 1; u <= rack.total_units; u++) {
      if (!occupied.has(u)) {
        available.push(u);
      }
    }

    return available;
  }
}