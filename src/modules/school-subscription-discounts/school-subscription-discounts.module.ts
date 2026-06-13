import { Module } from '@nestjs/common';
import { PrismaService } from '../../cores/prisma.service';
import { SchoolSubscriptionDiscountsController } from './school-subscription-discounts.controller';
import { SchoolSubscriptionDiscountsService } from './school-subscription-discounts.service';

@Module({
  controllers: [SchoolSubscriptionDiscountsController],
  providers: [SchoolSubscriptionDiscountsService, PrismaService],
  exports: [SchoolSubscriptionDiscountsService],
})
export class SchoolSubscriptionDiscountsModule {}
