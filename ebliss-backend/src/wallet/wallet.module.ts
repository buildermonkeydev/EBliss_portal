import { Module , forwardRef} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import {AdminWalletController} from './admin-wallet.controller'
import { AuthModule } from '../auth/auth.module';



@Module({
  imports: [PrismaModule, NotificationModule , forwardRef(() => AuthModule)],
  controllers: [WalletController , AdminWalletController],
  providers: [WalletService],
  exports: [WalletService], 
})
export class WalletModule {}