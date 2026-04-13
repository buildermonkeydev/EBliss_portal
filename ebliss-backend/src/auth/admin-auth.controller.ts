// src/admin/auth/admin-auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: { email: string; password: string }) {
    const { email, password } = loginDto;
    
    console.log('Login attempt for:', email);
    console.log('Password provided:', !!password);

    // Find admin user
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { email },
    });

    if (!adminUser) {
      console.log('Admin user not found:', email);
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('Admin user found:', { 
      id: adminUser.id, 
      email: adminUser.email, 
      role: adminUser.role 
    });

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, adminUser.password_hash);
    console.log('Password valid?', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Invalid password for:', email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Create JWT payload for access token (short-lived)
    const accessPayload = {
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      type: 'admin' as const,
    };

    // Create JWT payload for refresh token (long-lived)
    const refreshPayload = {
      sub: adminUser.id,
      email: adminUser.email,
      type: 'admin_refresh' as const,
    };

    console.log('Creating JWT tokens...');
    
    // Generate tokens with different expiration times
    const access_token = this.jwtService.sign(accessPayload, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    } as any); // Type assertion to bypass strict checking
    
    const refresh_token = this.jwtService.sign(refreshPayload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    } as any); // Type assertion to bypass strict checking

    // Store refresh token in database
    await this.prisma.adminRefreshToken.create({
      data: {
        token: refresh_token,
        admin_user_id: adminUser.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    console.log('Tokens created successfully');

    return {
      access_token,
      refresh_token,
      expires_in: 15 * 60, // 15 minutes in seconds
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        created_at: adminUser.created_at,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh admin access token' })
  async refreshToken(@Body() refreshTokenDto: { refresh_token: string }) {
    const { refresh_token } = refreshTokenDto;

    if (!refresh_token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refresh_token, {
        secret: process.env.JWT_SECRET,
      }) as any; // Type assertion

      // Check if it's a refresh token
      if (payload.type !== 'admin_refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if token exists in database and is not revoked
      const storedToken = await this.prisma.adminRefreshToken.findFirst({
        where: {
          token: refresh_token,
          revoked: false,
          expires_at: {
            gt: new Date(),
          },
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Get admin user
      const adminUser = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub },
      });

      if (!adminUser) {
        throw new UnauthorizedException('Admin user not found');
      }

      // Create new access token payload
      const accessPayload = {
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        type: 'admin' as const,
      };

      // Generate new access token
      const access_token = this.jwtService.sign(accessPayload, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      } as any); // Type assertion

      // Generate a new refresh token (token rotation)
      const newRefreshPayload = {
        sub: adminUser.id,
        email: adminUser.email,
        type: 'admin_refresh' as const,
      };

      const new_refresh_token = this.jwtService.sign(newRefreshPayload, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      } as any); // Type assertion

      // Revoke old refresh token and save new one
      await this.prisma.$transaction([
        this.prisma.adminRefreshToken.update({
          where: { id: storedToken.id },
          data: { revoked: true },
        }),
        this.prisma.adminRefreshToken.create({
          data: {
            token: new_refresh_token,
            admin_user_id: adminUser.id,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        }),
      ]);

      console.log('Token refreshed successfully for admin:', adminUser.email);

      return {
        access_token,
        refresh_token: new_refresh_token,
        expires_in: 15 * 60, // 15 minutes in seconds
        user: {
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
        },
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin logout' })
  async logout(@Body() logoutDto: { refresh_token?: string }) {
    const { refresh_token } = logoutDto;

    if (refresh_token) {
      // Revoke the refresh token
      await this.prisma.adminRefreshToken.updateMany({
        where: { token: refresh_token },
        data: { revoked: true },
      });
    }

    return { message: 'Logged out successfully' };
  }

  @Post('setup/super-admin')
  @ApiOperation({ summary: 'Setup initial super admin (one-time use)' })
  async setupSuperAdmin(@Body() setupDto: { email: string; password: string; setupKey: string }) {
    const { email, password, setupKey } = setupDto;
    
    // Verify setup key from environment
    if (setupKey !== process.env.SUPER_ADMIN_SETUP_KEY) {
      throw new UnauthorizedException('Invalid setup key');
    }

    // Check if any admin exists
    const adminCount = await this.prisma.adminUser.count();
    if (adminCount > 0) {
      throw new UnauthorizedException('Setup already completed');
    }

    // Create super admin
    const passwordHash = await bcrypt.hash(password, 10);
    const superAdmin = await this.prisma.adminUser.create({
      data: {
        email,
        password_hash: passwordHash,
        role: 'super_admin',
      },
    });

    return {
      message: 'Super admin created successfully',
      user: {
        id: superAdmin.id,
        email: superAdmin.email,
        role: superAdmin.role,
      },
    };
  }
}