// src/pop/admin-pop.controller.ts
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
  Patch,NotFoundException
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, AdminRole } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin - POPs')
@Controller('admin/pops')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminPopController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get all POPs/locations (Admin)' })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  async getAllPOPs(
    @Query('include_inactive') includeInactive: boolean = true,
  ) {
    const where = includeInactive ? {} : { active: true };
    
    const pops = await this.prisma.pop.findMany({
      where,
      include: {
        _count: {
          select: {
            nodes: true,
            ip_addresses: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: pops,
      total: pops.length,
    };
  }

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get POPs statistics (Admin)' })
  async getPOPsStats() {
    const pops = await this.prisma.pop.findMany({
      include: {
        nodes: {
          include: {
            vms: {
              select: {
                id: true,
                status: true,
                hourly_rate: true,
              },
            },
          },
        },
      },
    });

    const stats = pops.map(pop => {
      const nodes = pop.nodes;
      const totalNodes = nodes.length;
      const activeNodes = nodes.filter(n => n.status === 'active').length;
      const totalVMs = nodes.reduce((sum, n) => sum + n.vms.length, 0);
      const runningVMs = nodes.reduce((sum, n) => sum + n.vms.filter(v => v.status === 'running').length, 0);

      return {
        id: pop.id,
        name: pop.name,
        city: pop.city,
        country: pop.country,
        active: pop.active,
        stats: {
          totalNodes,
          activeNodes,
          totalVMs,
          runningVMs,
        },
      };
    });

    return {
      success: true,
      data: stats,
      summary: {
        totalPOPs: pops.length,
        activePOPs: pops.filter(p => p.active).length,
        totalNodes: stats.reduce((sum, s) => sum + s.stats.totalNodes, 0),
        totalVMs: stats.reduce((sum, s) => sum + s.stats.totalVMs, 0),
        runningVMs: stats.reduce((sum, s) => sum + s.stats.runningVMs, 0),
      },
    };
  }

  @Get(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get POP by ID (Admin)' })
  async getPOPById(@Param('id', ParseIntPipe) id: number) {
    const pop = await this.prisma.pop.findUnique({
      where: { id },
      include: {
        nodes: {
          select: {
            id: true,
            hostname: true,
            status: true,
            max_vcpu: true,
            max_ram_gb: true,
            max_storage_gb: true,
            _count: { select: { vms: true } },
          },
        },
        ip_addresses: {
          where: { status: 'available' },
          take: 20,
        },
      },
    });

    if (!pop) {
      throw new NotFoundException(`POP with ID ${id} not found`);
    }

    return {
      success: true,
      data: pop,
    };
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new POP (Admin)' })
  async createPOP(@Body() data: {
    name: string;
    city: string;
    country: string;
    active?: boolean;
  }) {
    const pop = await this.prisma.pop.create({
      data: {
        name: data.name,
        city: data.city,
        country: data.country,
        active: data.active ?? true,
      },
    });

    return {
      success: true,
      data: pop,
      message: 'POP created successfully',
    };
  }

  @Patch(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update POP (Admin)' })
  async updatePOP(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    const pop = await this.prisma.pop.update({
      where: { id },
      data: {
        name: data.name,
        city: data.city,
        country: data.country,
        active: data.active,
      },
    });

    return {
      success: true,
      data: pop,
      message: 'POP updated successfully',
    };
  }

  @Delete(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete POP (Admin)' })
  async deletePOP(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.pop.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'POP deleted successfully',
    };
  }

  @Patch(':id/toggle')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Toggle POP active status (Admin)' })
  async togglePOPStatus(@Param('id', ParseIntPipe) id: number) {
    const pop = await this.prisma.pop.findUnique({
      where: { id },
    });

    if (!pop) {
      throw new NotFoundException(`POP with ID ${id} not found`);
    }

    const updated = await this.prisma.pop.update({
      where: { id },
      data: { active: !pop.active },
    });

    return {
      success: true,
      data: updated,
      message: `POP is now ${updated.active ? 'active' : 'inactive'}`,
    };
  }

  @Get(':id/nodes')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get nodes in POP (Admin)' })
  async getPOPNodes(@Param('id', ParseIntPipe) id: number) {
    const nodes = await this.prisma.node.findMany({
      where: { pop_id: id },
      include: {
        _count: { select: { vms: true } },
      },
    });

    return {
      success: true,
      data: nodes,
      total: nodes.length,
    };
  }
}