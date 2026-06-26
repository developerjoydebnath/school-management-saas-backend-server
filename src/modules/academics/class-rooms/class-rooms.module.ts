import { Module } from '@nestjs/common';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { ClassRoomsController } from './class-rooms.controller';
import { ClassRoomsService } from './class-rooms.service';

@Module({
  controllers: [ClassRoomsController],
  providers: [ClassRoomsService, PrismaService, TenantConnectionService],
})
export class ClassRoomsModule {}
