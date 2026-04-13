import { Module } from '@nestjs/common';
import { FirewallController } from './firewall.controller';
import { FirewallService } from './firewall.service';
import { ProxmoxModule } from '../proxmox/proxmox.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ProxmoxModule, PrismaModule],
  controllers: [FirewallController],
  providers: [FirewallService],
  exports: [FirewallService],
})
export class FirewallModule {}