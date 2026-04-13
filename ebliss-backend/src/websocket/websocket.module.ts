// backend/src/websocket/websocket.module.ts
import { Module } from '@nestjs/common';
import { ConsoleGateway } from './console.gateway';
import { ProxmoxModule } from '../proxmox/proxmox.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ProxmoxModule, PrismaModule],
  providers: [ConsoleGateway],
  exports: [ConsoleGateway],
})
export class WebsocketModule {}