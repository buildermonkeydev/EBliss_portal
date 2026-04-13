import { Module } from '@nestjs/common';
import { DedicatedServersService } from './dedicated-servers.service';
import { DedicatedServersController } from './dedicated-servers.controller';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../auth/services/email.service';

@Module({
  controllers: [DedicatedServersController],
  providers: [DedicatedServersService, PrismaService, EmailService],
  exports: [DedicatedServersService],
})
export class DedicatedServersModule {}