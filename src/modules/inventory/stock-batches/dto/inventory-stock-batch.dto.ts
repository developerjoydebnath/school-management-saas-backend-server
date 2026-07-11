import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

export class UpdateInventoryStockBatchDto extends PartialType(CreateInventoryStockBatchDto) {}
