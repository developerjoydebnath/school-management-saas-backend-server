import { Module } from '@nestjs/common';
import { PrismaService } from '../../cores/prisma.service';
import { PublicPortalController } from './public-portal.controller';
import { PublicPortalService } from './public-portal.service';

@Module({
  controllers: [PublicPortalController],
  providers: [PublicPortalService, PrismaService],
})
export class PublicPortalModule {}
