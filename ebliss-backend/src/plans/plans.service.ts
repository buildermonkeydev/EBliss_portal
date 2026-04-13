import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanType } from '@prisma/client';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async getAllPlans(type?: PlanType) {
    const where: any = { is_active: true };
    if (type) where.type = type;

    const plans = await this.prisma.plan.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { vcpu: 'asc' },
      ],
    });

    return plans;
  }

  async getPlan(id: number) {
    const plan = await this.prisma.plan.findUnique({
      where: { id, is_active: true },
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    return plan;
  }

  async getOSTemplates() {
    const templates = await this.prisma.osTemplate.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });

    return templates;
  }
}