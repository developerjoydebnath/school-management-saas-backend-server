import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountAdjustmentType, DiscountValueType } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsUUID,
  IsDateString,
} from 'class-validator';

export class CreateSchoolSubscriptionDiscountDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  subscriptionId: string;

  @ApiProperty({ enum: DiscountAdjustmentType })
  @IsEnum(DiscountAdjustmentType)
  @IsNotEmpty()
  adjustmentType: DiscountAdjustmentType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  voucherId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  voucherCode?: string;

  @ApiProperty({ enum: DiscountValueType })
  @IsEnum(DiscountValueType)
  @IsNotEmpty()
  discountType: DiscountValueType;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  discountValue: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  discountAmountBdt: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  durationCycles?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  appliedCyclesCount?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  revokedAt?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  revokeReason?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}
