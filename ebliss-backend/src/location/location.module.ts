import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { ProxmoxModule } from '../proxmox/proxmox.module';
import { PrismaModule } from '../prisma/prisma.module';
import {AdminPopController } from './admin-pop.controller'
import { AdminNodeController } from './admin-node.controller'





@Module({
  imports: [ProxmoxModule, PrismaModule],
  controllers: [LocationController , AdminPopController  , AdminNodeController ],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}