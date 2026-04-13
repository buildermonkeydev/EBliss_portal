// src/ipam/ipam.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { IPAMService } from './ipam.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, AdminRole } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin - IPAM')
@Controller('admin/ipam')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IPAMController {
  constructor(private readonly ipamService: IPAMService) {}

  // ============ IP POOLS ============

  @Get('pools')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get all IP pools' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'pop_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getIPPools(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('pop_id') pop_id?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.ipamService.getAllIPPools({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      pop_id: pop_id ? parseInt(pop_id) : undefined,
      status,
      search,
    });
  }

  @Get('pools/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get IP pool by ID' })
  async getIPPool(@Param('id', ParseIntPipe) id: number) {
    return this.ipamService.getIPPoolById(id);
  }

  @Post('pools')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create IP pool' })
  async createIPPool(@Body() data: {
    pop_id: number;
    name: string;
    subnet: string;
    gateway: string;
    start_ip: string;
    end_ip: string;
  }) {
    return this.ipamService.createIPPool(data);
  }

  @Put('pools/:id')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update IP pool' })
  async updateIPPool(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    return this.ipamService.updateIPPool(id, data);
  }

  @Delete('pools/:id')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete IP pool' })
  async deleteIPPool(@Param('id', ParseIntPipe) id: number) {
    return this.ipamService.deleteIPPool(id);
  }

  @Post('pools/:id/sync')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Sync IP pool with Proxmox' })
  async syncIPPool(@Param('id', ParseIntPipe) id: number) {
    return this.ipamService.syncIPPool(id);
  }

  // ============ IP ADDRESSES ============

  @Get('addresses')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get all IP addresses' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'pool_id', required: false })
  @ApiQuery({ name: 'pop_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getIPAddresses(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('pool_id') pool_id?: string,
    @Query('pop_id') pop_id?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.ipamService.getAllIPAddresses({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      pool_id: pool_id ? parseInt(pool_id) : undefined,
      pop_id: pop_id ? parseInt(pop_id) : undefined,
      status,
      search,
    });
  }

  @Get('addresses/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get IP address by ID' })
  async getIPAddress(@Param('id', ParseIntPipe) id: number) {
    return this.ipamService.getIPAddressById(id);
  }

  @Post('addresses/:id/assign')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Assign IP to VM' })
  async assignIPToVM(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { vm_id: number; user_id: number },
  ) {
    return this.ipamService.assignIPToVM(id, data.vm_id, data.user_id);
  }

  @Post('addresses/:id/release')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Release IP address' })
  async releaseIP(@Param('id', ParseIntPipe) id: number) {
    return this.ipamService.releaseIP(id);
  }

  @Patch('addresses/:id/ptr')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Set PTR record' })
  async setPTRRecord(
    @Param('id', ParseIntPipe) id: number,
    @Body('ptr_record') ptrRecord: string,
  ) {
    return this.ipamService.setPTRRecord(id, ptrRecord);
  }

  // ============ STATS ============

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get IPAM statistics' })
  async getStats() {
    return this.ipamService.getIPAMStats();
  }
}