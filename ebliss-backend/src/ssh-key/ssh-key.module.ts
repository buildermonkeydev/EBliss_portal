import { Module } from '@nestjs/common';
import { SSHKeyController } from './ssh-key.controller';
import { SSHKeyService } from './ssh-key.service';
import { ProxmoxModule } from '../proxmox/proxmox.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ProxmoxModule, PrismaModule],
  controllers: [SSHKeyController],
  providers: [SSHKeyService],
  exports: [SSHKeyService],
})
export class SSHKeyModule {}