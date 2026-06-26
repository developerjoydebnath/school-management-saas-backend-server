import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateClassRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  roomNo: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  floor?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  building?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  highBench?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  lowBench?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  chair?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  table?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  board?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  projector?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  fan?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  light?: number;

  @IsBoolean()
  @IsOptional()
  hasAc?: boolean;

  @IsBoolean()
  @IsOptional()
  hasCctv?: boolean;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateClassRoomDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  roomNo?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  floor?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  building?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  highBench?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  lowBench?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  chair?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  table?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  board?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  projector?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  fan?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  light?: number;

  @IsBoolean()
  @IsOptional()
  hasAc?: boolean;

  @IsBoolean()
  @IsOptional()
  hasCctv?: boolean;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
