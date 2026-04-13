// src/vm/admin-vm.controller.ts
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
  Patch,
  Put,
} from '@nestjs/common';
import { VMService } from './vm.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, AdminRole } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin - VMs')
@Controller('admin/vms')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminVMController {
  constructor(private readonly vmService: VMService) {}

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all VMs (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'node_id', required: false, type: Number })
  @ApiQuery({ name: 'user_id', required: false, type: Number })
  async getAllVMs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('node_id') nodeId?: string,
    @Query('user_id') userId?: string,
  ) {
    return this.vmService.adminGetAllVMs({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status,
      nodeId: nodeId ? parseInt(nodeId) : undefined,
      userId: userId ? parseInt(userId) : undefined,
    });
  }

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get VM statistics (Admin)' })
  async getVMStats() {
    return this.vmService.adminGetVMStats();
  }

  @Get(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get VM details by ID (Admin)' })
  async getVMById(@Param('id', ParseIntPipe) id: number) {
    return this.vmService.adminGetVMById(id);
  }

  @Post()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Create VM for any user (Admin)' })
  async createVM(@Body() data: {
    user_id: number;
    node_id: number;
    plan_id: number;
    os_template_id: number;
    name: string;
    hostname: string;
    ssh_key_ids?: number[];
    firewall_group_id?: number;
    cloud_init_data?: string;
  }) {
    return this.vmService.adminCreateVM(data);
  }

  @Patch(':id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Update VM (Admin)' })
  async updateVM(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    return this.vmService.adminUpdateVM(id, data);
  }

  @Delete(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete VM (Admin)' })
  async deleteVM(@Param('id', ParseIntPipe) id: number) {
    return this.vmService.adminDeleteVM(id);
  }

  @Post(':id/start')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Start VM (Admin)' })
  async startVM(@Param('id', ParseIntPipe) id: number) {
    return this.vmService.adminStartVM(id);
  }

  @Post(':id/stop')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Stop VM (Admin)' })
  async stopVM(@Param('id', ParseIntPipe) id: number) {
    return this.vmService.adminStopVM(id);
  }

  @Post(':id/restart')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Restart VM (Admin)' })
  async restartVM(@Param('id', ParseIntPipe) id: number) {
    return this.vmService.adminRestartVM(id);
  }

  @Post(':id/suspend')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Suspend VM (Admin)' })
  async suspendVM(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.vmService.adminSuspendVM(id, reason);
  }

  @Post(':id/resume')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Resume suspended VM (Admin)' })
  async resumeVM(@Param('id', ParseIntPipe) id: number) {
    return this.vmService.adminResumeVM(id);
  }

  @Post(':id/resize')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Resize VM (Admin)' })
  async resizeVM(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { vcpu: number; ram_gb: number; ssd_gb: number },
  ) {
    return this.vmService.adminResizeVM(id, data);
  }

  @Post(':id/migrate')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Migrate VM to another node (Admin)' })
  async migrateVM(
    @Param('id', ParseIntPipe) id: number,
    @Body('target_node_id') targetNodeId: number,
  ) {
    return this.vmService.adminMigrateVM(id, targetNodeId);
  }

  @Get(':id/console')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get VM console access (Admin)' })
  async getConsole(@Param('id', ParseIntPipe) id: number) {
    return this.vmService.adminGetConsole(id);
  }

  @Get(':id/stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get VM statistics (Admin)' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async getStats(
    @Param('id', ParseIntPipe) id: number,
    @Query('days') days: string = '30',
  ) {
    return this.vmService.adminGetVMStatss(id, parseInt(days));
  }

  @Get(':id/billing')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get VM billing (Admin)' })
  async getVMBilling(
    @Param('id', ParseIntPipe) id: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.vmService.adminGetVMBilling(id, startDate, endDate);
  }
}