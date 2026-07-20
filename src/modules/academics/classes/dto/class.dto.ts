import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class SectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  enName: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  bnName?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  @IsOptional()
  sections?: SectionDto[];
}

export class UpdateClassDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  enName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  bnName?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  @IsOptional()
  sections?: SectionDto[];
}
