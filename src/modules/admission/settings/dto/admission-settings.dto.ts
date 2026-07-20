import { Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpsertAdmissionSettingsDto {
  @IsIn(['fast', 'full'])
  @IsOptional()
  admissionMode?: string;

  @IsBoolean()
  @IsOptional()
  onlinePortalEnabled?: boolean;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  onlinePortalSlug?: string;

  @IsDateString()
  @IsOptional()
  onlinePortalOpensAt?: string;

  @IsDateString()
  @IsOptional()
  onlinePortalClosesAt?: string;

  @IsBoolean()
  @IsOptional()
  draftEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  discountEnabled?: boolean;

  @IsIn(['percentage', 'fixed_amount'])
  @IsOptional()
  discountType?: string;

  @IsIn(['admission_fee', 'required_total', 'shown_total'])
  @IsOptional()
  discountScope?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountValue?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountMaxAmount?: number;

  @IsIn(['stack_all', 'best_only'])
  @IsOptional()
  discountStackingMode?: string;

  @IsBoolean()
  @IsOptional()
  manualDiscountEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  quotaDiscountEnabled?: boolean;

  @Allow()
  @IsOptional()
  quotaDiscountRules?: any;

  @IsBoolean()
  @IsOptional()
  referenceEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  defaultAdmissionFee?: number;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  applicationPrefix?: string;
}

export class AdmissionFieldConfigDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fieldKey: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  section: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  label: string;

  @IsString()
  @MaxLength(150)
  @IsOptional()
  labelBn?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  fieldType: string;

  @Allow()
  @IsOptional()
  options?: any;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  placeholder?: string;

  @IsString()
  @MaxLength(300)
  @IsOptional()
  helpText?: string;

  @IsBoolean()
  @IsOptional()
  isShown?: boolean;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  showInFastMode?: boolean;

  @IsBoolean()
  @IsOptional()
  showInFullMode?: boolean;

  @IsBoolean()
  @IsOptional()
  requiredInFastMode?: boolean;

  @IsBoolean()
  @IsOptional()
  requiredInFullMode?: boolean;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;

  @IsBoolean()
  @IsOptional()
  isSystemLocked?: boolean;

  @IsBoolean()
  @IsOptional()
  isCustom?: boolean;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  dependsOnFieldKey?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsInt()
  @IsOptional()
  minLength?: number;

  @IsInt()
  @IsOptional()
  maxLength?: number;

  @IsNumber()
  @IsOptional()
  minValue?: number;

  @IsNumber()
  @IsOptional()
  maxValue?: number;

  @IsString()
  @MaxLength(300)
  @IsOptional()
  regexPattern?: string;
}

export class UpdateAdmissionFieldsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdmissionFieldConfigDto)
  fields: AdmissionFieldConfigDto[];
}

export class AdmissionFeeHeadClassAmountDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  classId: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class AdmissionFeeHeadDto {
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  nameBn?: string;

  @IsString()
  @MaxLength(60)
  @IsOptional()
  code?: string;

  @IsIn(['one_time', 'monthly', 'yearly'])
  @IsOptional()
  type?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsBoolean()
  @IsOptional()
  isShown?: boolean;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdmissionFeeHeadClassAmountDto)
  @IsOptional()
  classAmounts?: AdmissionFeeHeadClassAmountDto[];
}

export class UpdateAdmissionFeeHeadsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdmissionFeeHeadDto)
  feeHeads: AdmissionFeeHeadDto[];
}
