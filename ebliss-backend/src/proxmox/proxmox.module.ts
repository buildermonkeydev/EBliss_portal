import { Module } from '@nestjs/common';
import { ProxmoxService } from './proxmox.service';
import { ProxmoxController } from './proxmox.controller';

@Module({
  controllers: [ProxmoxController],
  providers: [ProxmoxService],
  exports: [ProxmoxService],
})
export class ProxmoxModule {}