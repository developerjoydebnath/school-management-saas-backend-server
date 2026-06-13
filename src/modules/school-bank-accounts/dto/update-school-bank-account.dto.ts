import { PartialType } from '@nestjs/swagger';
import { CreateSchoolBankAccountDto } from './create-school-bank-account.dto';

export class UpdateSchoolBankAccountDto extends PartialType(
  CreateSchoolBankAccountDto,
) {}
