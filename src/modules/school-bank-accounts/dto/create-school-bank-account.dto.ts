import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateSchoolBankAccountDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountLabel: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountPurpose: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bankBranch?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bankRoutingNo?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountNo: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mobileBankingProvider?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mobileBankingNo?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
