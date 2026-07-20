import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { SessionClassSectionsController } from './session-class-sections.controller';
import { SessionClassSectionsService } from './session-class-sections.service';

@Module({
  controllers: [SessionClassSectionsController],
  providers: [SessionClassSectionsService, PrismaService, TenantConnectionService],
})
export class SessionClassSectionsModule {}
