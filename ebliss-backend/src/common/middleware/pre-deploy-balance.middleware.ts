// src/common/middleware/pre-deploy-balance.middleware.ts
import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

// Extend Express Request type to include user
interface RequestWithUser extends Request {
  user?: {
    id: number;
    email?: string;
    role?: string;
  };
}

@Injectable()
export class PreDeployBalanceMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: RequestWithUser, res: Response, next: NextFunction) {
    if (req.path === '/vms/deploy' && req.method === 'POST') {
      const userId = req.user?.id;
      const { cores, memory, disk, enableBackup } = req.body;

      if (!userId) {
        throw new BadRequestException('User not authenticated');
      }

      // Validate required fields
      if (!cores || !memory || !disk) {
        throw new BadRequestException('Missing required VM configuration fields');
      }

      // Calculate estimated monthly cost
      const basePrice = 0.12;
      const cpuPrice = cores * 0.10;
      const ramPrice = (memory / 1024) * 0.08;
      const diskPrice = disk * 0.012;
      const backupPrice = enableBackup ? 0.025 : 0;
      
      const hourlyRate = basePrice + cpuPrice + ramPrice + diskPrice + backupPrice;
      const monthlyCost = hourlyRate * 720;
      const requiredBalance = monthlyCost; // 1 month minimum

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { wallet_balance: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      const currentBalance = user.wallet_balance.toNumber();

      if (currentBalance < requiredBalance) {
        throw new BadRequestException(
          `Insufficient balance for VM deployment. Required: ₹${requiredBalance.toFixed(2)} (1 month equivalent). ` +
          `Current balance: ₹${currentBalance.toFixed(2)}. Please add funds to your wallet.`
        );
      }

      // Attach calculated rates to request
      req.body.hourlyRate = parseFloat(hourlyRate.toFixed(4));
      req.body.monthlyRate = parseFloat(monthlyCost.toFixed(2));
      req.body.requiredBalance = requiredBalance;
    }

    next();
  }
}