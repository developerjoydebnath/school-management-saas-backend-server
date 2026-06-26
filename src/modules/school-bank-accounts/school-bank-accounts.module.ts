import { Module } from '@nestjs/common';
import { PrismaService, TenantConnectionService } from '../../cores/prisma.service';
import { SchoolBankAccountsController } from './school-bank-accounts.controller';
import { SchoolBankAccountsService } from './school-bank-accounts.service';

@Module({
  controllers: [SchoolBankAccountsController],
  providers: [SchoolBankAccountsService, PrismaService, TenantConnectionService],
  exports: [SchoolBankAccountsService],
})
export class SchoolBankAccountsModule {}
