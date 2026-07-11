import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export enum InventoryMaintenanceStatusDto {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

export enum InventoryMaintenancePriorityDto {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class CreateInventoryMaintenanceDto {
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
  locationId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  issueTitle: string;

  @IsString()
  @IsOptional()
  issueDescription?: string;

  @IsEnum(InventoryMaintenanceStatusDto)
  @IsOptional()
  status?: InventoryMaintenanceStatusDto;

  @IsEnum(InventoryMaintenancePriorityDto)
  @IsOptional()
  priority?: InventoryMaintenancePriorityDto;

  @IsString()
  @IsOptional()
  serviceProvider?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  cost?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateInventoryMaintenanceDto extends PartialType(
  CreateInventoryMaintenanceDto,
) {}

export class MaintenanceFilterDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  chartPeriod?: string;

  @IsOptional()
  @IsString()
  chartFrom?: string;

  @IsOptional()
  @IsString()
  chartTo?: string;
}
