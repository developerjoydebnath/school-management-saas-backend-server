import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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
