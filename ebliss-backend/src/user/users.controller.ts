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
  Req,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, AdminRole } from '../auth/decorators/roles.decorator';
import { 
  ApiTags, 
  ApiBearerAuth, 
  ApiOperation, 
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UpdateProfileDto } from "./dto/update-profile.dto";

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(AdminRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() createUserDto: {
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

  @Get()
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.TECHNICAL, AdminRole.ACCOUNTANT)
  
  @UseGuards( RolesGuard)
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  async findAll(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    console.log("This route got just hit")
    console.log(' User hitting /users route:', {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      type: req.user?.type,
    });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    return this.usersService.findAll({ skip, take, where });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getCurrentUser(@Req() req) {
    return this.usersService.findOne(req.user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateCurrentUser(
    @Req() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateUser(req.user.id, updateProfileDto);
  }

  @Get('me/activity')
  @ApiOperation({ summary: 'Get current user activity log' })
  async getMyActivity(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.usersService.getUserActivity(req.user.id, limitNum, pageNum);
  }

  @Get('stats')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
   @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats() {
    const { data } = await this.usersService.findAll({ take: 1000 });
    
    const totalUsers = data.length;
    const activeUsers = data.filter(u => u.role === 'customer').length;
    const verifiedUsers = data.filter(u => u.verified).length;
    const totalBalance = data.reduce((sum, u) => sum + (u.wallet_balance?.toNumber() || 0), 0);
    
    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      totalBalance,
      verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0,
    };
  }

  @Get('security/stats')
  @ApiOperation({ summary: 'Get user security statistics' })
  async getSecurityStats(@Req() req) {
    return this.usersService.getSecurityStats(req.user.id);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get active sessions for current user' })
  async getActiveSessions(@Req() req) {
    return this.usersService.getActiveSessions(req.user.id);
  }

  @Delete('sessions/all')
  @ApiOperation({ summary: 'Revoke all other sessions' })
  async revokeAllOtherSessions(@Req() req) {
    return this.usersService.revokeAllOtherSessions(req.user.id, req.user.sessionId);
  }

  @Get('notifications/preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  async getNotificationPreferences(@Req() req) {
    return this.usersService.getNotificationPreferences(req.user.id);
  }

  @Put('notifications/preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  async updateNotificationPreferences(
    @Req() req,
    @Body() preferences: {
      new_login?: boolean;
      suspicious_activity?: boolean;
      security_changes?: boolean;
    },
  ) {
    return this.usersService.updateNotificationPreferences(req.user.id, preferences);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @Req() req,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.usersService.revokeSession(req.user.id, sessionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req) {
    // Allow admin users or the user themselves
    const adminRoles = [AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT, AdminRole.TECHNICAL];
    if (!adminRoles.includes(req.user.role) && req.user.id !== id) {
      throw new Error('Unauthorized');
    }
    return this.usersService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStatsById(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const adminRoles = [AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT, AdminRole.TECHNICAL];
    if (!adminRoles.includes(req.user.role) && req.user.id !== id) {
      throw new Error('Unauthorized');
    }
    return this.usersService.getUserStats(id);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get user activity log' })
  async getUserActivity(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit: number = 20,
    @Req() req,
  ) {
    const adminRoles = [AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT, AdminRole.TECHNICAL];
    if (!adminRoles.includes(req.user.role) && req.user.id !== id) {
      throw new Error('Unauthorized');
    }
    return this.usersService.getUserActivity(id, limit);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: any,
    @Req() req,
  ) {
    const adminRoles = [AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT, AdminRole.TECHNICAL];
    if (!adminRoles.includes(req.user.role) && req.user.id !== id) {
      throw new Error('Unauthorized');
    }
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Patch(':id/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user password' })
  async updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { oldPassword: string; newPassword: string },
    @Req() req,
  ) {
    if (req.user.id !== id) {
      throw new Error('Unauthorized');
    }
    await this.usersService.updatePassword(id, body.oldPassword, body.newPassword);
    return { message: 'Password updated successfully' };
  }

  @Post(':id/verify')
  @Roles(AdminRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Verify user' })
  async verifyUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.verifyUser(id);
  }

  @Post(':id/suspend')
  @Roles(AdminRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Suspend user' })
  async suspendUser(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Req() req,
  ) {
    return this.usersService.suspendUser(id, reason, req.user.id);
  }

  @Post(':id/activate')
  @Roles(AdminRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Activate user' })
  async activateUser(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.usersService.activateUser(id, req.user.id);
  }

  @Patch(':id/tax')
  @Roles(AdminRole.SUPER_ADMIN, AdminRole.ACCOUNTANT)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update user tax settings' })
  async updateTaxSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { taxId: string; taxRate?: number },
  ) {
    return this.usersService.updateTaxSettings(id, body.taxId, body.taxRate);
  }

  @Delete(':id')
  @Roles(AdminRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete user' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteUser(id);
  }
}