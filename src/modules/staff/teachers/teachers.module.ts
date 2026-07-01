import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { PrismaService, TenantConnectionService } from 'src/cores/prisma.service';

@Module({
  controllers: [TeachersController],
  providers: [TeachersService, PrismaService, TenantConnectionService],
  exports: [TeachersService],
})
export class TeachersModule {}
