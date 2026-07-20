import { Module } from '@nestjs/common';
import { PrismaService } from 'src/cores/prisma.service';
import { UsernamesService } from './usernames.service';

@Module({
  providers: [UsernamesService, PrismaService],
  exports: [UsernamesService],
})
export class UsernamesModule {}
