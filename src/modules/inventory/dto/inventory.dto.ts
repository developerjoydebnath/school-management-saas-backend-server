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

export enum InventoryLocationTypeDto {
  CLASSROOM = 'CLASSROOM',
  LAB = 'LAB',
  LIBRARY = 'LIBRARY',
  OFFICE = 'OFFICE',
  STAFFROOM = 'STAFFROOM',
  SPORTS_ROOM = 'SPORTS_ROOM',
  MOSQUE_ROOM = 'MOSQUE_ROOM',
  STORE = 'STORE',
  CANTEEN = 'CANTEEN',
  COMMON_AREA = 'COMMON_AREA',
  OTHER = 'OTHER',
}

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

export enum InventoryMovementTypeDto {
  PURCHASE = 'PURCHASE',
  TRANSFER = 'TRANSFER',
  ISSUE = 'ISSUE',
  RETURN = 'RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
  DAMAGE = 'DAMAGE',
  REPAIR_OUT = 'REPAIR_OUT',
  REPAIR_IN = 'REPAIR_IN',
  DISPOSE = 'DISPOSE',
  LOST = 'LOST',
}

export class CreateInventoryCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  nameBn?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  iconName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  colorCode?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateInventoryCategoryDto extends PartialType(
  CreateInventoryCategoryDto,
) {}

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

export class CreateInventoryLocationDto {
  @IsEnum(InventoryLocationTypeDto)
  locationType: InventoryLocationTypeDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  building?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  floor?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  roomNo?: string;

  @IsUUID()
  @IsOptional()
  classRoomId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateInventoryLocationDto extends PartialType(
  CreateInventoryLocationDto,
) {}

export class CreateInventoryStockBatchDto {
  @IsUUID()
  itemId: string;

  @IsUUID()
  locationId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantityTotal: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  quantityGood?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  quantityDamaged?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  quantityDisposed?: number;

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
  @MaxLength(150)
  supplier?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
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
  @MaxLength(20)
  warrantyPeriodUnit?: string;

  @IsString()
  @IsOptional()
  warrantyNotes?: string;

  @IsString()
  @IsOptional()
  invoiceImageUrl?: string;

  @IsString()
  @IsOptional()
  invoicePlaceholder?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateInventoryStockBatchDto extends PartialType(
  CreateInventoryStockBatchDto,
) {}

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
  notes?: string;
}

export class UpdateInventoryAssetDto extends PartialType(
  CreateInventoryAssetDto,
) {}

export class CreateInventoryMovementDto {
  @IsUUID()
  itemId: string;

  @IsUUID()
  @IsOptional()
  assetId?: string;

  @IsUUID()
  @IsOptional()
  stockBatchId?: string;

  @IsUUID()
  @IsOptional()
  fromLocationId?: string;

  @IsUUID()
  @IsOptional()
  toLocationId?: string;

  @IsEnum(InventoryMovementTypeDto)
  movementType: InventoryMovementTypeDto;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  referenceNo?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}


