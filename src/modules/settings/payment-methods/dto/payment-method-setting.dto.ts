import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const PAYMENT_METHOD_PROVIDERS = [
  'cash',
  'bank_transfer',
  'bkash',
  'nagad',
  'rocket',
  'sslcommerz',
  'custom',
] as const;

export const PAYMENT_METHOD_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export const PAYMENT_METHOD_MODES = ['manual', 'sandbox', 'live'] as const;

export class CreatePaymentMethodSettingDto {
  @IsString()
  @IsIn(PAYMENT_METHOD_PROVIDERS)
  provider: string;

  @IsString()
  @MaxLength(120)
  displayName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(PAYMENT_METHOD_MODES)
  mode?: string;

  @IsOptional()
  @IsString()
  @IsIn(PAYMENT_METHOD_STATUSES)
  status?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsObject()
  credentialData?: Record<string, any>;

  @IsOptional()
  @IsObject()
  publicConfig?: Record<string, any>;
}

export class UpdatePaymentMethodSettingDto extends CreatePaymentMethodSettingDto {}

export class UpdatePaymentMethodStatusDto {
  @IsString()
  @IsIn(PAYMENT_METHOD_STATUSES)
  status: string;
}
