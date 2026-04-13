import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { AdminUsersController } from './admin-users.controller'; // Add this

@Module({
  imports: [PrismaModule, WalletModule],
  controllers: [UsersController , AdminUsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}