// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor() {
    super();
    this.logger.log(' JwtAuthGuard INSTANTIATED');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    this.logger.log(` JwtAuthGuard checking: ${request.method} ${request.url}`);
    
    const authHeader = request.headers.authorization;
    this.logger.log(` Auth header present: ${!!authHeader}`);
    
    if (authHeader) {
      this.logger.log(` Auth header starts with: ${authHeader.substring(0, 20)}...`);
    }

    try {
      // IMPORTANT: Call the parent canActivate and await it
      const result = await super.canActivate(context);
      this.logger.log(` Parent canActivate result: ${result}`);
      
      // Check if user was attached to request
      this.logger.log(`👤 User attached to request: ${!!request.user}`);
      if (request.user) {
        this.logger.log(` User authenticated: ${request.user.email} (${request.user.role})`);
      }
      
      return result as boolean;
    } catch (error) {
      this.logger.error(` JwtAuthGuard error: ${error.message}`, error.stack);
      throw error;
    }
  }

  handleRequest(err: any, user: any, info: any) {
    this.logger.log(` handleRequest called`);
    this.logger.log(`  - err: ${err ? err.message : 'none'}`);
    this.logger.log(`  - user: ${user ? `${user.email} (${user.role})` : 'none'}`);
    this.logger.log(`  - info: ${info ? info.message : 'none'}`);
    
    if (err) {
      this.logger.error(` Authentication error: ${err.message}`);
      throw err;
    }
    
    if (info) {
      this.logger.warn(` JWT Info: ${info.message}`);
    }
    
    if (!user) {
      this.logger.error(` No user found - authentication failed`);
      throw new UnauthorizedException('Invalid or expired token');
    }
    
    this.logger.log(`JWT Authentication successful for: ${user.email}`);
    return user;
  }
}