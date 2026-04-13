import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateColocationDto, PowerFeedDto } from './dto/create-colocation.dto';
import { UpdateColocationDto } from './dto/update-colocation.dto';
import { AssignColocationDto } from './dto/assign-colocation.dto';
import { ColocationStatus, CabinetType, AccessLevel, Prisma } from '@prisma/client';

@Injectable()
export class ColocationService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateColocationDto) {
    // Check if position is already occupied
    const existing = await this.prisma.colocation.findFirst({
      where: {
        datacenter: createDto.datacenter,
        rack_id: createDto.rack_id,
        unit_position: createDto.unit_position,
      },
    });

    if (existing) {
      throw new ConflictException('This rack position is already occupied');
    }

    // Calculate total power capacity from power feeds
    const totalPower = createDto.power_feeds?.reduce((sum, feed) => {
      const power = (feed.voltage * feed.amperage) / 1000;
      return sum + power;
    }, 0) || createDto.power_capacity_kw || 1.0;

    // Update rack used units
    await this.updateRackUsedUnits(createDto.rack_id, createDto.unit_size, 'add');

    const colocation = await this.prisma.colocation.create({
      data: {
        user_id: createDto.user_id,
        datacenter: createDto.datacenter,
        rack_id: createDto.rack_id,
        rack_name: createDto.rack_name,
        unit_position: createDto.unit_position,
        unit_size: createDto.unit_size,
        cabinet_type: createDto.cabinet_type || CabinetType.standard,
        power_capacity_kw: totalPower,
        network_port: createDto.network_port || '1 Gbps',
        bandwidth_mbps: createDto.bandwidth_mbps || 1000,
        cross_connects: createDto.cross_connects || 0,
        ipv4_allocation: createDto.ipv4_allocation,
        ipv6_allocation: createDto.ipv6_allocation,
        asn: createDto.asn,
        access_level: createDto.access_level || AccessLevel.full,
        biometric_access: createDto.biometric_access || false,
        security_camera: createDto.security_camera ?? true,
        cooling_type: createDto.cooling_type,
        monthly_price: createDto.monthly_price,
        setup_fee: createDto.setup_fee || 0,
        power_cost_per_kwh: createDto.power_cost_per_kwh || 0,
        cross_connect_fee: createDto.cross_connect_fee || 0,
        sla_uptime_guarantee: createDto.sla_uptime_guarantee || 99.9,
        sla_credit_percent: createDto.sla_credit_percent || 5,
        notes: createDto.notes,
        tags: createDto.tags || [],
        power_feeds: {
          create: createDto.power_feeds?.map(feed => ({
            name: feed.name,
            voltage: feed.voltage,
            amperage: feed.amperage,
            phase: feed.phase,
            power_kw: (feed.voltage * feed.amperage) / 1000,
          })) || [],
        },
      },
      include: {
        power_feeds: true,
        assigned_to: {
          select: { id: true, full_name: true, email: true, company: true },
        },
      },
    });

    return colocation;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    status?: ColocationStatus;
    datacenter?: string;
    userId?: number;
    search?: string;
  }) {
    const { skip = 0, take = 20, status, datacenter, userId, search } = params;

    const where: Prisma.ColocationWhereInput = {};

    if (status) where.status = status;
    if (datacenter) where.datacenter = datacenter;
    if (userId) where.user_id = userId;
    if (search) {
      where.OR = [
        { rack_id: { contains: search, mode: 'insensitive' } },
        { datacenter: { contains: search, mode: 'insensitive' } },
        { assigned_to: { full_name: { contains: search, mode: 'insensitive' } } },
        { assigned_to: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [colocations, total] = await Promise.all([
      this.prisma.colocation.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          power_feeds: true,
          assigned_to: {
            select: { id: true, full_name: true, email: true, company: true },
          },
          ip_addresses: true,
        },
      }),
      this.prisma.colocation.count({ where }),
    ]);

    return { colocations, total };
  }

  async findOne(id: string) {
    const colocation = await this.prisma.colocation.findUnique({
      where: { id },
      include: {
        power_feeds: true,
        assigned_to: {
          select: { id: true, full_name: true, email: true, company: true, phone: true },
        },
        ip_addresses: true,
        access_logs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });

    if (!colocation) {
      throw new NotFoundException('Colocation not found');
    }

    return colocation;
  }

  async update(id: string, updateDto: UpdateColocationDto) {
    const existing = await this.findOne(id);

    // Handle rack unit changes
    if (updateDto.unit_size && updateDto.unit_size !== existing.unit_size) {
      await this.updateRackUsedUnits(existing.rack_id, existing.unit_size, 'remove');
      await this.updateRackUsedUnits(updateDto.rack_id || existing.rack_id, updateDto.unit_size, 'add');
    }

    const updateData: any = { ...updateDto };

    // Handle power feeds update
    if (updateDto.power_feeds) {
      // Delete existing power feeds
      await this.prisma.colocationPowerFeed.deleteMany({
        where: { colocation_id: id },
      });

      // Calculate total power
      const totalPower = updateDto.power_feeds.reduce((sum, feed) => {
        return sum + (feed.voltage * feed.amperage) / 1000;
      }, 0);

      updateData.power_capacity_kw = totalPower;
      updateData.power_feeds = {
        create: updateDto.power_feeds.map(feed => ({
          name: feed.name,
          voltage: feed.voltage,
          amperage: feed.amperage,
          phase: feed.phase,
          power_kw: (feed.voltage * feed.amperage) / 1000,
        })),
      };
    }

    const colocation = await this.prisma.colocation.update({
      where: { id },
      data: updateData,
      include: {
        power_feeds: true,
        assigned_to: {
          select: { id: true, full_name: true, email: true, company: true },
        },
      },
    });

    return colocation;
  }

  async remove(id: string) {
    const colocation = await this.findOne(id);

    if (colocation.status === ColocationStatus.active) {
      throw new BadRequestException('Cannot delete an active colocation. Please terminate it first.');
    }

    // Update rack used units
    await this.updateRackUsedUnits(colocation.rack_id, colocation.unit_size, 'remove');

    await this.prisma.colocation.delete({ where: { id } });

    return { message: 'Colocation deleted successfully' };
  }

  async assignToUser(id: string, assignDto: AssignColocationDto) {
    const colocation = await this.findOne(id);

    if (colocation.user_id) {
      throw new BadRequestException('Colocation is already assigned to a user');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: assignDto.user_id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.colocation.update({
      where: { id },
      data: {
        user_id: assignDto.user_id,
        contract_start: assignDto.contract_start ? new Date(assignDto.contract_start) : new Date(),
        contract_end: assignDto.contract_end ? new Date(assignDto.contract_end) : null,
        auto_renew: assignDto.auto_renew ?? true,
        notes: assignDto.notes || colocation.notes,
        status: ColocationStatus.active,
      },
      include: {
        power_feeds: true,
        assigned_to: {
          select: { id: true, full_name: true, email: true, company: true },
        },
      },
    });

    // Log access
    await this.prisma.colocationAccessLog.create({
      data: {
        colocation_id: id,
        user_name: user.full_name,
        user_email: user.email,
        company: user.company,
        access_type: 'entry',
        access_method: 'manual',
        status: 'success',
        reason: 'Initial assignment',
      },
    });

    return updated;
  }

  async unassignColocation(id: string) {
    const colocation = await this.findOne(id);

    if (!colocation.user_id) {
      throw new BadRequestException('Colocation is not assigned to any user');
    }

    const updated = await this.prisma.colocation.update({
      where: { id },
      data: {
        user_id: null,
        contract_start: null,
        contract_end: null,
        status: ColocationStatus.pending,
      },
      include: {
        power_feeds: true,
        assigned_to: true,
      },
    });

    return updated;
  }

  async updateStatus(id: string, status: ColocationStatus) {
    await this.findOne(id);

    const updated = await this.prisma.colocation.update({
      where: { id },
      data: { status },
      include: {
        power_feeds: true,
        assigned_to: {
          select: { id: true, full_name: true, email: true, company: true },
        },
      },
    });

    return updated;
  }

  async updatePowerUsage(id: string, power_used_kw: number) {
    await this.findOne(id);

    return this.prisma.colocation.update({
      where: { id },
      data: { power_used_kw },
    });
  }

  async updateBandwidthUsage(id: string, bandwidth_used_mbps: number) {
    await this.findOne(id);

    return this.prisma.colocation.update({
      where: { id },
      data: { bandwidth_used_mbps },
    });
  }

  async logAccess(id: string, data: {
    user_name: string;
    user_email?: string;
    company?: string;
    access_type: 'entry' | 'exit' | 'denied' | 'escort';
    access_method: 'biometric' | 'keycard' | 'pin' | 'manual';
    escorted_by?: string;
    reason?: string;
    status?: 'success' | 'failed' | 'pending';
  }) {
    await this.findOne(id);

    return this.prisma.colocationAccessLog.create({
      data: {
        colocation_id: id,
        ...data,
      },
    });
  }

  async getAccessLogs(id: string, limit: number = 50) {
    return this.prisma.colocationAccessLog.findMany({
      where: { colocation_id: id },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async getStatistics() {
    const [total, byStatus, byDatacenter, totalRevenue, totalPower] = await Promise.all([
      this.prisma.colocation.count(),
      this.prisma.colocation.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.colocation.groupBy({
        by: ['datacenter'],
        _count: true,
      }),
      this.prisma.colocation.aggregate({
        where: { user_id: { not: null } },
        _sum: { monthly_price: true },
      }),
      this.prisma.colocation.aggregate({
        _sum: { power_capacity_kw: true },
      }),
    ]);

    const active = byStatus.find(s => s.status === 'active')?._count || 0;

    return {
      total,
      active,
      by_status: byStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {}),
      by_datacenter: byDatacenter.reduce((acc, curr) => {
        acc[curr.datacenter] = curr._count;
        return acc;
      }, {}),
      monthly_revenue: totalRevenue._sum.monthly_price || 0,
      total_power_kw: totalPower._sum.power_capacity_kw || 0,
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
      available_units: this.calculateAvailableUnits(rack),
    }));
  }

  async getRackAvailability(rackId: string) {
    const rack = await this.prisma.rack.findUnique({
      where: { id: rackId },
      include: { devices: true },
    });

    if (!rack) {
      throw new NotFoundException('Rack not found');
    }

    const occupied = new Set<number>();
    rack.devices.forEach(device => {
      for (let i = 0; i < device.size_u; i++) {
        occupied.add(device.position + i);
      }
    });

    const available: number[] = [];
    const used: number[] = [];
    
    for (let u = 1; u <= rack.total_units; u++) {
      if (occupied.has(u)) {
        used.push(u);
      } else {
        available.push(u);
      }
    }

    return { available_units: available, used_units: used };
  }

  private async updateRackUsedUnits(rackId: string, unitSize: number, operation: 'add' | 'remove') {
    const rack = await this.prisma.rack.findUnique({
      where: { id: rackId },
    });

    if (!rack) return;

    const increment = operation === 'add' ? unitSize : -unitSize;
    const newUsedUnits = Math.max(0, rack.used_units + increment);

    await this.prisma.rack.update({
      where: { id: rackId },
      data: {
        used_units: newUsedUnits,
        available_units: rack.total_units - newUsedUnits,
        status: newUsedUnits >= rack.total_units ? 'full' : 'operational',
      },
    });
  }

  private calculateAvailableUnits(rack: any): number {
    const occupied = new Set<number>();
    rack.devices.forEach((device: any) => {
      for (let i = 0; i < device.size_u; i++) {
        occupied.add(device.position + i);
      }
    });
    return rack.total_units - occupied.size;
  }
}