// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { EmailService } from './services/email.service';
import { TokenService } from './services/token.service';
import { UsersService } from '../user/users.service';
import { WalletModule } from 'src/wallet/wallet.module';
import { HttpModule } from '@nestjs/axios';
import { AdminAuthController } from './admin-auth.controller';

//  IMPORT THE GUARDS
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module'; //  Import PrismaModule

@Module({
  imports: [
    PassportModule.register({ 
      defaultStrategy: 'jwt',  //  Add default strategy
      session: false,
    }),
    WalletModule,
    HttpModule,
    PrismaModule,  //  Add PrismaModule for database access
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_ACCESS_SECRET') || configService.get('JWT_SECRET'),
        signOptions: { 
          expiresIn: configService.get('JWT_ACCESS_EXPIRY', '7d')  //  Change to 7d for admin tokens
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, AdminAuthController],
  providers: [
    AuthService,
    UsersService,
    JwtStrategy,
    JwtRefreshStrategy,
    LocalStrategy,
    EmailService,
    TokenService,
    JwtAuthGuard,      //  ADD THIS
    RolesGuard,        //  ADD THIS
  ],
  exports: [
    AuthService, 
    TokenService, 
    EmailService, 
    JwtModule,
    JwtAuthGuard,      //  ADD THIS - Export so other modules can use it
    RolesGuard,        //  ADD THIS - Export so other modules can use it
  ],
})
export class AuthModule {}