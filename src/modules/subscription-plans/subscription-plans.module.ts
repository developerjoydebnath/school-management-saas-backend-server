import { Module } from '@nestjs/common';
import { PrismaService } from '../../cores/prisma.service';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { SubscriptionPlansService } from './subscription-plans.service';

@Module({
  controllers: [SubscriptionPlansController],
  providers: [SubscriptionPlansService, PrismaService],
  exports: [SubscriptionPlansService],
})
export class SubscriptionPlansModule {}
