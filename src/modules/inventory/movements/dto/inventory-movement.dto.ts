import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export enum MovementType {
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

export class CreateInventoryMovementDto {
  @IsUUID()
  @IsNotEmpty()
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

  @IsEnum(MovementType)
  @IsNotEmpty()
  movementType: MovementType;

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
