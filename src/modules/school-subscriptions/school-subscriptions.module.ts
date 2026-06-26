import { Module } from '@nestjs/common';
import { PrismaService, TenantConnectionService } from '../../cores/prisma.service';
import { SchoolSubscriptionsController } from './school-subscriptions.controller';
import { SchoolSubscriptionsService } from './school-subscriptions.service';

@Module({
  controllers: [SchoolSubscriptionsController],
  providers: [SchoolSubscriptionsService, PrismaService, TenantConnectionService],
  exports: [SchoolSubscriptionsService],
})
export class SchoolSubscriptionsModule {}
