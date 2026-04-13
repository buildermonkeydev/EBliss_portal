// src/ipam/ipam.module.ts
import { Module } from '@nestjs/common';
import { IPAMController } from './ipam.controller';
import { IPAMService } from './ipam.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProxmoxModule } from '../proxmox/proxmox.module';

@Module({
  imports: [PrismaModule, ProxmoxModule],
  controllers: [IPAMController],
  providers: [IPAMService],
  exports: [IPAMService],
})
export class IPAMModule {}