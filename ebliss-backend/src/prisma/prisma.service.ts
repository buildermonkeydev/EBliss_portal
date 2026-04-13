import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // For Prisma Client v7+, you need to specify either adapter or accelerateUrl
    // Since we're using standard PostgreSQL connection, we don't need a driver adapter
    // We can use the default behavior by passing empty options or using the default constructor
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      // If you're using a driver adapter (like for PostgreSQL), you would specify it here:
      // adapter: new PostgresNeon(process.env.DATABASE_URL),
      // But for standard Prisma Client, we don't need one
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') return;

    const models = Reflect.ownKeys(this).filter((key) => {
      return typeof this[key] === 'object' && 
             this[key] !== null && 
             typeof this[key].deleteMany === 'function';
    });

    return Promise.all(
      models.map((modelKey) => this[modelKey].deleteMany()),
    );
  }
}