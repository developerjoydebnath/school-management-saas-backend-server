import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from '../../cores/prisma.service';
import { SchoolsActivationService } from './schools.activation.service';
import { SchoolsController } from './schools.controller';
import { SchoolsMigrationService } from './schools.migration.service';
import { SchoolsPublicController } from './schools.public.controller';
import { SchoolsService } from './schools.service';

@Module({
  controllers: [SchoolsController, SchoolsPublicController],
  providers: [
    SchoolsService,
    SchoolsActivationService,
    SchoolsMigrationService,
    PrismaService,
    TenantConnectionService,
  ],
  exports: [SchoolsService, SchoolsActivationService],
})
export class SchoolsModule {}
