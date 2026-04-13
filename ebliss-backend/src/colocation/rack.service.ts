import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRackDto } from './dto/create-rack.dto';
import { UpdateRackDto } from './dto/update-rack.dto';
import { CreateRackDeviceDto } from './dto/create-rack-device.dto';
import { RackStatus, DeviceStatus } from '@prisma/client';

@Injectable()
export class RackService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // Rack CRUD Operations
  // ============================================

  async createRack(createDto: CreateRackDto) {
    // Check if rack name already exists
    const existing = await this.prisma.rack.findUnique({
      where: { name: createDto.name },
    });

    if (existing) {
      throw new ConflictException('Rack with this name already exists');
    }

    const totalUnits = createDto.total_units || 42;

    const rack = await this.prisma.rack.create({
      data: {
        name: createDto.name,
        datacenter: createDto.datacenter,
        location: createDto.location,
        total_units: totalUnits,
        available_units: totalUnits,
        used_units: 0,
        power_capacity_kw: createDto.power_capacity_kw || 10,
        power_used_kw: 0,
        temperature_c: createDto.temperature_c,
        humidity_percent: createDto.humidity_percent,
        status: createDto.status || RackStatus.operational,
      },
      include: {
        devices: true,
      },
    });

    return rack;
  }

  async getAllRacks(params: {
    skip?: number;
    take?: number;
    datacenter?: string;
    status?: RackStatus;
    search?: string;
  }) {
    const { skip = 0, take = 20, datacenter, status, search } = params;

    const where: any = {};

    if (datacenter) where.datacenter = datacenter;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { datacenter: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [racks, total] = await Promise.all([
      this.prisma.rack.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          devices: {
            orderBy: { position: 'asc' },
          },
        },
      }),
      this.prisma.rack.count({ where }),
    ]);

    return {
      racks: racks.map(rack => ({
        ...rack,
        utilization_percent: (rack.used_units / rack.total_units) * 100,
        power_utilization_percent: (rack.power_used_kw / rack.power_capacity_kw) * 100,
      })),
      total,
    };
  }

  async getRackById(id: string) {
    const rack = await this.prisma.rack.findUnique({
      where: { id },
      include: {
        devices: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!rack) {
      throw new NotFoundException('Rack not found');
    }

    // Calculate unit occupancy
    const occupiedUnits = this.getOccupiedUnitsMap(rack.devices);
    const availableUnits = this.getAvailablePositions(rack.total_units, occupiedUnits);

    return {
      ...rack,
      utilization_percent: (rack.used_units / rack.total_units) * 100,
      power_utilization_percent: (rack.power_used_kw / rack.power_capacity_kw) * 100,
      occupied_units_map: Array.from(occupiedUnits),
      available_positions: availableUnits,
      devices_by_position: this.mapDevicesByPosition(rack.devices, rack.total_units),
    };
  }

  async updateRack(id: string, updateDto: UpdateRackDto) {
    const rack = await this.getRackById(id);

    // If total_units is being decreased, check if it would affect existing devices
    if (updateDto.total_units && updateDto.total_units < rack.total_units) {
      const maxPosition = Math.max(...rack.devices.map(d => d.position + d.size_u - 1), 0);
      if (maxPosition > updateDto.total_units) {
        throw new BadRequestException(
          `Cannot reduce rack size to ${updateDto.total_units}U. Devices occupy up to position ${maxPosition}U`
        );
      }
    }

    const updateData: any = { ...updateDto };

    // Recalculate available units if total_units changes
    if (updateDto.total_units) {
      const occupiedUnits = this.getOccupiedUnitsMap(rack.devices);
      updateData.available_units = updateDto.total_units - occupiedUnits.size;
    }

    const updated = await this.prisma.rack.update({
      where: { id },
      data: updateData,
      include: {
        devices: true,
      },
    });

    return updated;
  }

  async deleteRack(id: string) {
    const rack = await this.getRackById(id);

    if (rack.devices.length > 0) {
      throw new BadRequestException('Cannot delete rack with active devices. Please remove all devices first.');
    }

    // Check if rack has colocations
    const colocations = await this.prisma.colocation.findFirst({
      where: { rack_id: id },
    });

    if (colocations) {
      throw new BadRequestException('Cannot delete rack with assigned colocations.');
    }

    await this.prisma.rack.delete({ where: { id } });

    return { message: 'Rack deleted successfully' };
  }

  async updateRackStatus(id: string, status: RackStatus, reason?: string) {
    const rack = await this.getRackById(id);

    const updated = await this.prisma.rack.update({
      where: { id },
      data: {
        status,
        ...(status === RackStatus.maintenance && { last_inspection: new Date() }),
      },
    });

    return updated;
  }

  async updateRackPower(id: string, power_used_kw: number) {
    const rack = await this.getRackById(id);

    if (power_used_kw > rack.power_capacity_kw) {
      throw new BadRequestException(`Power usage (${power_used_kw}kW) exceeds capacity (${rack.power_capacity_kw}kW)`);
    }

    const updated = await this.prisma.rack.update({
      where: { id },
      data: { power_used_kw },
    });

    return updated;
  }

  async updateRackEnvironment(id: string, temperature_c?: number, humidity_percent?: number) {
    const updated = await this.prisma.rack.update({
      where: { id },
      data: {
        ...(temperature_c !== undefined && { temperature_c }),
        ...(humidity_percent !== undefined && { humidity_percent }),
      },
    });

    return updated;
  }

  async performInspection(id: string, notes?: string) {
    const updated = await this.prisma.rack.update({
      where: { id },
      data: {
        last_inspection: new Date(),
      },
    });

    return updated;
  }

  // ============================================
  // Rack Device Operations
  // ============================================

  async addDevice(rackId: string, deviceDto: CreateRackDeviceDto) {
    const rack = await this.getRackById(rackId);

    // Check if position is available
    const occupiedUnits = this.getOccupiedUnitsMap(rack.devices);
    
    for (let i = 0; i < deviceDto.size_u; i++) {
      const position = deviceDto.position + i;
      if (occupiedUnits.has(position)) {
        throw new ConflictException(`Position U${position} is already occupied`);
      }
      if (position > rack.total_units) {
        throw new BadRequestException(`Position U${position} exceeds rack height (${rack.total_units}U)`);
      }
    }

    // Create device
    const device = await this.prisma.rackDevice.create({
      data: {
        rack_id: rackId,
        name: deviceDto.name,
        type: deviceDto.type,
        position: deviceDto.position,
        size_u: deviceDto.size_u,
        status: deviceDto.status || DeviceStatus.online,
        power_draw_watts: deviceDto.power_draw_watts,
        metadata: deviceDto.metadata,
      },
    });

    // Update rack statistics
    const newOccupiedUnits = this.getOccupiedUnitsMap([...rack.devices, device]);
    const newPowerUsed = (rack.power_used_kw || 0) + ((device.power_draw_watts || 0) / 1000);

    await this.prisma.rack.update({
      where: { id: rackId },
      data: {
        used_units: newOccupiedUnits.size,
        available_units: rack.total_units - newOccupiedUnits.size,
        power_used_kw: newPowerUsed,
        status: newOccupiedUnits.size >= rack.total_units ? RackStatus.full : rack.status,
      },
    });

    return device;
  }

  async updateDevice(rackId: string, deviceId: string, updateDto: Partial<CreateRackDeviceDto>) {
    const device = await this.prisma.rackDevice.findFirst({
      where: { id: deviceId, rack_id: rackId },
    });

    if (!device) {
      throw new NotFoundException('Device not found in this rack');
    }

    // If position or size is changing, check availability
    if (updateDto.position !== undefined || updateDto.size_u !== undefined) {
      const rack = await this.getRackById(rackId);
      const otherDevices = rack.devices.filter(d => d.id !== deviceId);
      const occupiedUnits = this.getOccupiedUnitsMap(otherDevices);

      const newPosition = updateDto.position ?? device.position;
      const newSize = updateDto.size_u ?? device.size_u;

      for (let i = 0; i < newSize; i++) {
        const pos = newPosition + i;
        if (occupiedUnits.has(pos)) {
          throw new ConflictException(`Position U${pos} is already occupied`);
        }
        if (pos > rack.total_units) {
          throw new BadRequestException(`Position U${pos} exceeds rack height (${rack.total_units}U)`);
        }
      }
    }

    const updated = await this.prisma.rackDevice.update({
      where: { id: deviceId },
      data: updateDto,
    });

    // Recalculate rack stats
    await this.recalculateRackStats(rackId);

    return updated;
  }

  async removeDevice(rackId: string, deviceId: string) {
    const device = await this.prisma.rackDevice.findFirst({
      where: { id: deviceId, rack_id: rackId },
    });

    if (!device) {
      throw new NotFoundException('Device not found in this rack');
    }

    await this.prisma.rackDevice.delete({
      where: { id: deviceId },
    });

    // Recalculate rack stats
    await this.recalculateRackStats(rackId);

    return { message: 'Device removed successfully' };
  }

  async updateDeviceStatus(rackId: string, deviceId: string, status: DeviceStatus) {
    const device = await this.prisma.rackDevice.findFirst({
      where: { id: deviceId, rack_id: rackId },
    });

    if (!device) {
      throw new NotFoundException('Device not found in this rack');
    }

    const updated = await this.prisma.rackDevice.update({
      where: { id: deviceId },
      data: { status },
    });

    return updated;
  }

  async getRackDevices(rackId: string) {
    const rack = await this.getRackById(rackId);
    return rack.devices;
  }

  async getRackStatistics() {
    const [totalRacks, byDatacenter, byStatus, totalUnits, totalPower] = await Promise.all([
      this.prisma.rack.count(),
      this.prisma.rack.groupBy({
        by: ['datacenter'],
        _count: true,
        _sum: {
          total_units: true,
          used_units: true,
          power_capacity_kw: true,
          power_used_kw: true,
        },
      }),
      this.prisma.rack.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.rack.aggregate({
        _sum: {
          total_units: true,
          used_units: true,
          available_units: true,
        },
      }),
      this.prisma.rack.aggregate({
        _sum: {
          power_capacity_kw: true,
          power_used_kw: true,
        },
      }),
    ]);

    const totalDevices = await this.prisma.rackDevice.count();
    const devicesByType = await this.prisma.rackDevice.groupBy({
      by: ['type'],
      _count: true,
    });

    return {
      total_racks: totalRacks,
      total_units: totalUnits._sum.total_units || 0,
      used_units: totalUnits._sum.used_units || 0,
      available_units: totalUnits._sum.available_units || 0,
      utilization_percent: ((totalUnits._sum.used_units || 0) / (totalUnits._sum.total_units || 1)) * 100,
      total_power_capacity_kw: totalPower._sum.power_capacity_kw || 0,
      total_power_used_kw: totalPower._sum.power_used_kw || 0,
      power_utilization_percent: ((totalPower._sum.power_used_kw || 0) / (totalPower._sum.power_capacity_kw || 1)) * 100,
      total_devices: totalDevices,
      by_datacenter: byDatacenter,
      by_status: byStatus.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {}),
      devices_by_type: devicesByType.reduce((acc, curr) => {
        acc[curr.type] = curr._count;
        return acc;
      }, {}),
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  private getOccupiedUnitsMap(devices: any[]): Set<number> {
    const occupied = new Set<number>();
    devices.forEach(device => {
      for (let i = 0; i < device.size_u; i++) {
        occupied.add(device.position + i);
      }
    });
    return occupied;
  }

  private getAvailablePositions(totalUnits: number, occupiedUnits: Set<number>): number[] {
    const available: number[] = [];
    for (let u = 1; u <= totalUnits; u++) {
      if (!occupiedUnits.has(u)) {
        available.push(u);
      }
    }
    return available;
  }

  private mapDevicesByPosition(devices: any[], totalUnits: number): any[] {
    const map = new Array(totalUnits + 1).fill(null);
    devices.forEach(device => {
      for (let i = 0; i < device.size_u; i++) {
        map[device.position + i] = {
          ...device,
          is_start: i === 0,
          is_end: i === device.size_u - 1,
        };
      }
    });
    return map;
  }

  private async recalculateRackStats(rackId: string) {
    const rack = await this.prisma.rack.findUnique({
      where: { id: rackId },
      include: { devices: true },
    });

    if (!rack) return;

    const occupiedUnits = this.getOccupiedUnitsMap(rack.devices);
    const powerUsed = rack.devices.reduce((sum, device) => sum + (device.power_draw_watts || 0), 0) / 1000;

    await this.prisma.rack.update({
      where: { id: rackId },
      data: {
        used_units: occupiedUnits.size,
        available_units: rack.total_units - occupiedUnits.size,
        power_used_kw: powerUsed,
        status: occupiedUnits.size >= rack.total_units ? RackStatus.full : rack.status,
      },
    });
  }

  async findAvailableRackSpace(datacenter: string, requiredUnits: number, requiredPowerKw?: number) {
    const racks = await this.prisma.rack.findMany({
      where: {
        datacenter,
        status: RackStatus.operational,
      },
      include: {
        devices: true,
      },
    });

    const availableRacks = racks.filter(rack => {
      const occupiedUnits = this.getOccupiedUnitsMap(rack.devices);
      const availableUnits = rack.total_units - occupiedUnits.size;
      const availablePower = rack.power_capacity_kw - rack.power_used_kw;

      const hasSpace = availableUnits >= requiredUnits;
      const hasPower = !requiredPowerKw || availablePower >= requiredPowerKw;

      // Find contiguous space
      if (hasSpace && hasPower) {
        return this.hasContiguousSpace(rack.total_units, occupiedUnits, requiredUnits);
      }

      return false;
    });

    return availableRacks.map(rack => {
      const occupiedUnits = this.getOccupiedUnitsMap(rack.devices);
      const contiguousStarts = this.findContiguousStarts(rack.total_units, occupiedUnits, requiredUnits);
      
      return {
        id: rack.id,
        name: rack.name,
        datacenter: rack.datacenter,
        location: rack.location,
        total_units: rack.total_units,
        available_units: rack.total_units - occupiedUnits.size,
        available_power_kw: rack.power_capacity_kw - rack.power_used_kw,
        contiguous_options: contiguousStarts.map(start => ({
          start_u: start,
          end_u: start + requiredUnits - 1,
        })),
      };
    });
  }

  private hasContiguousSpace(totalUnits: number, occupied: Set<number>, required: number): boolean {
    let contiguous = 0;
    for (let u = 1; u <= totalUnits; u++) {
      if (!occupied.has(u)) {
        contiguous++;
        if (contiguous >= required) return true;
      } else {
        contiguous = 0;
      }
    }
    return false;
  }

  private findContiguousStarts(totalUnits: number, occupied: Set<number>, required: number): number[] {
    const starts: number[] = [];
    let contiguous = 0;
    let startPos = 1;

    for (let u = 1; u <= totalUnits; u++) {
      if (!occupied.has(u)) {
        if (contiguous === 0) startPos = u;
        contiguous++;
        if (contiguous >= required) {
          starts.push(startPos);
        }
      } else {
        contiguous = 0;
      }
    }
    return starts;
  }
}