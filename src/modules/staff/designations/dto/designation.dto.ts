import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDesignationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  nameBn?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category: string;

  @IsArray()
  @IsString({ each: true })
  applicableTo: string[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  level?: number;

  @IsBoolean()
  @IsOptional()
  isHeadRole?: boolean;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateDesignationDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  nameBn?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicableTo?: string[];

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  level?: number;

  @IsBoolean()
  @IsOptional()
  isHeadRole?: boolean;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
