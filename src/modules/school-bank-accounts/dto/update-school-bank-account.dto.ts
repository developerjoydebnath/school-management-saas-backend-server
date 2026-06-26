import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSchoolBankAccountDto } from './create-school-bank-account.dto';

export class UpdateSchoolBankAccountDto extends PartialType(
  OmitType(CreateSchoolBankAccountDto, ['schoolId'] as const),
) {}
