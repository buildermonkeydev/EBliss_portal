// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_ACCESS_SECRET');
    
    // Try fallback to JWT_SECRET if JWT_ACCESS_SECRET is not set
    const secret = jwtSecret || configService.get<string>('JWT_SECRET');
    
    // Ensure secret is defined before calling super
    if (!secret) {
      throw new Error('JWT secret is not defined in environment variables. Please set JWT_ACCESS_SECRET or JWT_SECRET');
    }
    
    // Now secret is guaranteed to be a string
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret, // This is now definitely a string
    });
    
    // Now we can use this.logger
    const logger = new Logger(JwtStrategy.name);
    logger.log(`JWT Strategy initialized successfully`);
    logger.log(`JWT_ACCESS_SECRET: ${jwtSecret ? 'SET' : 'NOT SET'}`);
    logger.log(`JWT_SECRET: ${configService.get<string>('JWT_SECRET') ? 'SET' : 'NOT SET'}`);
    
    // Store logger for use in validate method
    this.logger = logger;
  }

  async validate(payload: any) {
    this.logger.log(' validate() called with payload:', JSON.stringify(payload));
    
    // Check if this is an admin token
    if (payload.type === 'admin') {
      this.logger.log(`Looking up admin user with ID: ${payload.sub}`);
      
      try {
        const admin = await this.prisma.adminUser.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            email: true,
            role: true,
            created_at: true,
          },
        });

        if (!admin) {
          this.logger.error(`Admin user not found with ID: ${payload.sub}`);
          throw new UnauthorizedException('Admin user not found');
        }

        this.logger.log(` Admin user found: ${admin.email} (${admin.role})`);
        return { ...admin, type: 'admin' };
      } catch (error) {
        this.logger.error('Database error:', error);
        throw new UnauthorizedException('Authentication failed');
      }
    }

    // Regular user flow
    this.logger.log(`Looking up regular user with ID: ${payload.sub}`);
    
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          full_name: true,
          role: true,
          verified: true,
          status: true,
        },
      });

      if (!user) {
        this.logger.error(`User not found with ID: ${payload.sub}`);
        throw new UnauthorizedException('User not found');
      }

      if (user.status !== 'active') {
        this.logger.error(`User is not active: ${user.status}`);
        throw new UnauthorizedException('User not found or inactive');
      }

      if (!user.verified) {
        this.logger.error('User email not verified');
        throw new UnauthorizedException('Email not verified');
      }

      this.logger.log(` Regular user found: ${user.email} (${user.role})`);
      return { ...user, type: 'user' };
    } catch (error) {
      this.logger.error('Database error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}