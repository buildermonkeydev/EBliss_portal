import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { OsTemplateController } from './os-template.controller';
import { OsTemplateService } from './os-template.service';
import { ProxmoxModule } from '../proxmox/proxmox.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ProxmoxModule,
    PrismaModule,
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024 * 1024, // 10GB limit
      },
    }),
  ],
  controllers: [OsTemplateController],
  providers: [OsTemplateService],
  exports: [OsTemplateService],
})
export class OsTemplateModule {}