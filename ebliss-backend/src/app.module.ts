import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './user/users.module';
import { WalletModule } from './wallet/wallet.module';
import { InvoiceModule } from './invoice/invoice.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';
import { CouponModule } from './coupon/coupon.module';
import { VMModule } from './vm/vm.module';
import { ProxmoxModule } from './proxmox/proxmox.module';
import { PlansModule } from './plans/plans.module';
import { DedicatedServersModule } from './dedicated-servers/dedicated-servers.module';
import { validateConfig } from './config/validation.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LocationModule } from './location/location.module';
import { FirewallModule } from './firewall/firewall.module';
import { OsTemplateModule } from './os-template/os-template.module';
import { SSHKeyModule } from './ssh-key/ssh-key.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { TicketModule } from './ticket/ticket.module';
import { WebsocketModule } from './websocket/websocket.module';
import { VncProxyService } from './console/vnc-proxy.service';
import { BillingScheduler } from './scheduler/billing.scheduler';
import { BillingQueue } from './queues/billing.queue';
import { VMQueue } from './queues/vm.queue';
import { PreDeployBalanceMiddleware } from './common/middleware/pre-deploy-balance.middleware';
import { RolesGuard } from './auth/guards/roles.guard';
// import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
// import { TransformInterceptor } from './common/interceptors/transform.interceptor';
// import { ErrorsInterceptor } from './common/interceptors/errors.interceptor';
import {IPAMModule} from './ipam/ipam.module'

import { ProductModule } from './product/product.module';

import { ColocationModule } from './colocation/colocation.module';










@Module({
  imports: [
    // Core Modules
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 100,
        },
      ],
    }),
    
    // BullMQ Configuration
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      }),
      inject: [ConfigService],
    }),
    
    // BullMQ Queues
    BullModule.registerQueue(
      { name: 'vm-queue' },
      { name: 'billing-queue' },
      { name: 'notification-queue' },
      { name: 'email-queue' },
    ),
    
    // Feature Modules
    PrismaModule,
    AuthModule,
    UsersModule,
    WalletModule,
    InvoiceModule,
    PaymentModule,
    NotificationModule,
    CouponModule,
    VMModule,
    ProxmoxModule,
    PlansModule,
    DedicatedServersModule,
    LocationModule,
    WebsocketModule,
    FirewallModule,
    OsTemplateModule,
    SSHKeyModule,
    ActivityLogsModule,
    TicketModule,IPAMModule , ColocationModule , ProductModule
  ],
  
  controllers: [AppController],
  
  providers: [
    AppService,
    VncProxyService,
    BillingScheduler,
    BillingQueue,
    VMQueue,
    
    // Global Guards
    // {
    //   provide: APP_GUARD,
    //   useClass: RolesGuard,
    // },
    
    // Global Interceptors
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: LoggingInterceptor,
    // },
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: TransformInterceptor,
    // },
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: ErrorsInterceptor,
    // },
  ],
  
  exports: [
    VncProxyService,
    BillingQueue,
    VMQueue,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PreDeployBalanceMiddleware)
      .forRoutes('vms');
  }
}