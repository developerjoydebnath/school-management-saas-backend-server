import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bnName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateSectionDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bnName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  status?: string;
}
