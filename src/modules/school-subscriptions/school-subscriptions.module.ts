import { Module } from '@nestjs/common';
import { PrismaService } from '../../cores/prisma.service';
import { SchoolSubscriptionsController } from './school-subscriptions.controller';
import { SchoolSubscriptionsService } from './school-subscriptions.service';

@Module({
  controllers: [SchoolSubscriptionsController],
  providers: [SchoolSubscriptionsService, PrismaService],
  exports: [SchoolSubscriptionsService],
})
export class SchoolSubscriptionsModule {}
