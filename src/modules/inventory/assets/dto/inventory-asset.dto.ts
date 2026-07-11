import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export enum InventoryConditionDto {
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  DAMAGED = 'DAMAGED',
  UNDER_REPAIR = 'UNDER_REPAIR',
  DISPOSED = 'DISPOSED',
}

export enum InventoryAssetStatusDto {
  IN_USE = 'IN_USE',
  IN_STORE = 'IN_STORE',
  UNDER_REPAIR = 'UNDER_REPAIR',
  DISPOSED = 'DISPOSED',
  LOST = 'LOST',
  STOLEN = 'STOLEN',
}

export class CreateInventoryAssetDto {
  @IsUUID()
  itemId: string;

  @IsUUID()
  locationId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  assetTag: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  serialNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  macAddress?: string;

  @IsEnum(InventoryConditionDto)
  @IsOptional()
  condition?: InventoryConditionDto;

  @IsEnum(InventoryAssetStatusDto)
  @IsOptional()
  status?: InventoryAssetStatusDto;

  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  purchaseDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  purchasePrice?: number;

  @IsString()
  @IsOptional()
  supplier?: string;

  @IsString()
  @IsOptional()
  invoiceNo?: string;

  @IsBoolean()
  @IsOptional()
  hasWarranty?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  warrantyPeriod?: number;

  @IsString()
  @IsOptional()
  warrantyPeriodUnit?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  imagePlaceholder?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateInventoryAssetDto extends PartialType(
  CreateInventoryAssetDto,
) {}
