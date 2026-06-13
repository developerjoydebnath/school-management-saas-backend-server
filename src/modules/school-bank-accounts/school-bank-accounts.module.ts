import { Module } from '@nestjs/common';
import { PrismaService } from '../../cores/prisma.service';
import { SchoolBankAccountsController } from './school-bank-accounts.controller';
import { SchoolBankAccountsService } from './school-bank-accounts.service';

@Module({
  controllers: [SchoolBankAccountsController],
  providers: [SchoolBankAccountsService, PrismaService],
  exports: [SchoolBankAccountsService],
})
export class SchoolBankAccountsModule {}
