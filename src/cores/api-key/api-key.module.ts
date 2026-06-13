import { Module } from '@nestjs/common';
import { PrismaService } from '../../cores/prisma.service';
import { ApiKeyService } from './api-key.service';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyGuard } from './guards/api-key.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [ConfigModule],
  providers: [
    PrismaService,
    ApiKeyService,
    ApiKeyGuard,
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
