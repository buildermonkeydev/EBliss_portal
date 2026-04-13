// src/node/admin-node.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Delete,
  Patch,NotFoundException , BadRequestException ,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, AdminRole } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ProxmoxService } from '../proxmox/proxmox.service';

@ApiTags('Admin - Nodes')
@Controller('admin/nodes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminNodeController {
  constructor(
    private prisma: PrismaService,
    private proxmoxService: ProxmoxService,
  ) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get all nodes (Admin)' })
  async getAllNodes() {
    const nodes = await this.prisma.node.findMany({
      include: {
        pop: true,
        _count: {
          select: { vms: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      success: true,
      data: nodes,
      total: nodes.length,
    };
  }

  @Get(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get node by ID (Admin)' })
  async getNodeById(@Param('id', ParseIntPipe) id: number) {
    const node = await this.prisma.node.findUnique({
      where: { id },
      include: {
        pop: true,
        vms: {
          select: {
            id: true,
            name: true,
            status: true,
            vcpu: true,
            ram_gb: true,
            ssd_gb: true,
          },
        },
      },
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${id} not found`);
    }

    return {
      success: true,
      data: node,
    };
  }

  @Get(':id/stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get node statistics (Admin)' })
  async getNodeStats(@Param('id', ParseIntPipe) id: number) {
    const node = await this.prisma.node.findUnique({
      where: { id },
      include: {
        vms: {
          select: {
            id: true,
            status: true,
            vcpu: true,
            ram_gb: true,
            ssd_gb: true,
            hourly_rate: true,
          },
        },
      },
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${id} not found`);
    }

    const usedVcpu = node.vms.reduce((sum, vm) => sum + vm.vcpu, 0);
    const usedRam = node.vms.reduce((sum, vm) => sum + vm.ram_gb, 0);
    const usedStorage = node.vms.reduce((sum, vm) => sum + vm.ssd_gb, 0);
    const runningVMs = node.vms.filter(v => v.status === 'running').length;

    // Try to get real-time stats from Proxmox
    let proxmoxStats = null;
    try {
      proxmoxStats = await this.proxmoxService.getNodeStatus(node.hostname);
    } catch (error) {
      // Ignore - Proxmox might be unreachable
    }

    return {
      success: true,
      data: {
        node_id: node.id,
        hostname: node.hostname,
        resources: {
          vcpu: { used: usedVcpu, max: node.max_vcpu },
          ram: { used: usedRam, max: node.max_ram_gb },
          storage: { used: usedStorage, max: node.max_storage_gb },
        },
        vms: {
          total: node.vms.length,
          running: runningVMs,
        },
        proxmox: proxmoxStats,
      },
    };
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new node (Admin)' })
  async createNode(@Body() data: {
    hostname: string;
    api_url: string;
    api_token_id: string;
    api_token_secret: string;
    ip_address: string;
    pop_id: number;
    max_vcpu: number;
    max_ram_gb: number;
    max_storage_gb: number;
  }) {
    const node = await this.prisma.node.create({
      data: {
        hostname: data.hostname,
        api_url: data.api_url,
        api_token_id: data.api_token_id,
        api_token_secret: data.api_token_secret,
        ip_address: data.ip_address,
        pop_id: data.pop_id,
        max_vcpu: data.max_vcpu,
        max_ram_gb: data.max_ram_gb,
        max_storage_gb: data.max_storage_gb,
        status: 'active',
      },
    });

    return {
      success: true,
      data: node,
      message: 'Node created successfully',
    };
  }

  @Patch(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update node (Admin)' })
  async updateNode(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    const node = await this.prisma.node.update({
      where: { id },
      data: {
        hostname: data.hostname,
        api_url: data.api_url,
        api_token_id: data.api_token_id,
        api_token_secret: data.api_token_secret,
        ip_address: data.ip_address,
        pop_id: data.pop_id,
        max_vcpu: data.max_vcpu,
        max_ram_gb: data.max_ram_gb,
        max_storage_gb: data.max_storage_gb,
      },
    });

    return {
      success: true,
      data: node,
      message: 'Node updated successfully',
    };
  }

  @Delete(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete node (Admin)' })
  async deleteNode(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.node.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Node deleted successfully',
    };
  }

  @Post(':id/sync')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Sync node with Proxmox (Admin)' })
  async syncNode(@Param('id', ParseIntPipe) id: number) {
    const node = await this.prisma.node.findUnique({
      where: { id },
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${id} not found`);
    }

    try {
      const status = await this.proxmoxService.getNodeStatus(node.hostname);
      const stats = await this.proxmoxService.getNodeStats(node.hostname).catch(() => null);

      await this.prisma.node.update({
        where: { id },
        data: {
          status: status?.status === 'online' ? 'active' : 'offline',
          max_vcpu: stats?.cpu || node.max_vcpu,
          max_ram_gb: stats?.memory?.total ? Math.floor(stats.memory.total / 1024 / 1024 / 1024) : node.max_ram_gb,
          max_storage_gb: stats?.disk?.total ? Math.floor(stats.disk.total / 1024 / 1024 / 1024) : node.max_storage_gb,
        },
      });

      return {
        success: true,
        message: `Node ${node.hostname} synced successfully`,
        status: status?.status,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to sync node: ${error.message}`);
    }
  }

  @Post(':id/maintenance')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Toggle node maintenance mode (Admin)' })
  async setMaintenance(
    @Param('id', ParseIntPipe) id: number,
    @Body('maintenance') maintenance: boolean,
  ) {
    const node = await this.prisma.node.update({
      where: { id },
      data: {
        status: maintenance ? 'maintenance' : 'active',
      },
    });

    return {
      success: true,
      data: node,
      message: `Node ${maintenance ? 'entered' : 'exited'} maintenance mode`,
    };
  }
}