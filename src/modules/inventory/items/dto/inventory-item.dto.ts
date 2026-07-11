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

export enum InventoryTrackingTypeDto {
  QUANTITY = 'QUANTITY',
  INDIVIDUAL = 'INDIVIDUAL',
}

export class CreateInventoryItemDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  nameBn?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  brand?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  model?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(InventoryTrackingTypeDto)
  @IsOptional()
  trackingType?: InventoryTrackingTypeDto;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  unit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  material?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  length?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  width?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  height?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  depth?: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  dimensionUnit?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  weight?: number;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  weightUnit?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  seatingCapacity?: number;

  @IsBoolean()
  @IsOptional()
  isSeatingItem?: boolean;

  @IsBoolean()
  @IsOptional()
  isDepreciable?: boolean;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  depreciationRate?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  usefulLifeYears?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minimumStock?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateInventoryItemDto extends PartialType(
  CreateInventoryItemDto,
) {}
