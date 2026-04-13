import { Module } from '@nestjs/common';
import { VMService } from './vm.service';
import { VMController } from './vm.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProxmoxModule } from '../proxmox/proxmox.module';
import { WalletModule } from '../wallet/wallet.module';
import { BullModule } from '@nestjs/bullmq';
import { AdminVMController } from './admin-vm.controller';
@Module({
  imports: [
    PrismaModule,
    ProxmoxModule,
    WalletModule,
    BullModule.registerQueue({
      name: 'vm-queue',
    }),
    BullModule.registerQueue({
      name: 'billing-queue',
    }),
  ],
  controllers: [VMController , AdminVMController],
  providers: [VMService],
  exports: [VMService],
})
export class VMModule {}