// src/user/admin-users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, AdminRole } from '../auth/decorators/roles.decorator';

@ApiTags('Admin - Users')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  // ============ CUSTOMER MANAGEMENT ROUTES ============
  
  @Get('users')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get all customers (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  async findAllCustomers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { full_name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    return this.usersService.findAll({ skip, take, where });
  }

  @Get('users/stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get customer statistics (Admin)' })
  async getCustomerStats() {
    const { data } = await this.usersService.findAll({ take: 1000 });
    
    const totalUsers = data.length;
    const activeUsers = data.filter(u => u.status === 'active').length;
    const verifiedUsers = data.filter(u => u.verified).length;
    const suspendedUsers = data.filter(u => u.status === 'suspended').length;
    const totalBalance = data.reduce((sum, u) => sum + (u.wallet_balance?.toNumber() || 0), 0);
    
    const usersByRole = data.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      suspendedUsers,
      totalBalance,
      usersByRole,
      verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0,
    };
  }

  @Get('users/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get customer by ID (Admin)' })
  async findCustomerById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post('users')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new customer (Admin)' })
  async createCustomer(@Body() createUserDto: {
    email: string;
    full_name: string;
    password: string;
    role?: string;
    phone?: string;
    company?: string;
    tax_id?: string;
    address?: any;
  }) {
    return this.usersService.createUser(createUserDto);
  }

  @Patch('users/:id')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update customer (Admin)' })
  async updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: any,
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Delete('users/:id')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete customer (Admin)' })
  async deleteCustomer(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteUser(id);
  }

  @Post('users/:id/verify')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Verify customer (Admin)' })
  async verifyCustomer(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.verifyUser(id);
  }

  @Post('users/:id/suspend')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend customer (Admin)' })
  async suspendCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.usersService.suspendUser(id, reason, req.user.id);
  }

  @Post('users/:id/activate')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Activate customer (Admin)' })
  async activateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.usersService.activateUser(id, req.user.id);
  }

  @Patch('users/:id/tax')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Update customer tax settings (Admin)' })
  async updateCustomerTaxSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { taxId: string; taxRate?: number },
  ) {
    return this.usersService.updateTaxSettings(id, body.taxId, body.taxRate);
  }

  @Get('users/:id/activity')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL)
  @ApiOperation({ summary: 'Get customer activity (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getCustomerActivity(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.usersService.getUserActivity(id, limitNum, pageNum);
  }

  @Get('users/:id/stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Get customer statistics by ID (Admin)' })
  async getCustomerStatsById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserStats(id);
  }

  // ============ ADMIN USER MANAGEMENT ROUTES ============

  @Get('admins')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all admin users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAllAdmins(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search?: string,
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const where: any = {};

    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }

    return this.usersService.findAllAdmins({ skip, take, where });
  }

  @Get('admins/stats')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get admin statistics' })
  async getAdminStats() {
    return this.usersService.getAdminStats();
  }

  @Get('admins/:id')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get admin user by ID' })
  async findAdminById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findAdminById(id);
  }

  @Post('admins')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new admin user' })
  async createAdmin(@Body() createAdminDto: {
    email: string;
    password: string;
    role: string;
  }) {
    return this.usersService.createAdmin(createAdminDto);
  }

  @Patch('admins/:id')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update admin user' })
  async updateAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAdminDto: { role?: string; password?: string },
  ) {
    return this.usersService.updateAdmin(id, updateAdminDto);
  }

  @Delete('admins/:id')
  @Roles(AdminRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete admin user' })
  async deleteAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteAdmin(id);
  }
}