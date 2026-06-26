import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

// =======================
// Division DTOs
// =======================

export class CreateDivisionDto {
  @ApiProperty({ example: 'ঢাকা' })
  @IsString()
  @IsNotEmpty()
  bnName: string;

  @ApiProperty({ example: 'Dhaka' })
  @IsString()
  @IsNotEmpty()
  enName: string;
}

export class UpdateDivisionDto {
  @ApiPropertyOptional({ example: 'ঢাকা' })
  @IsString()
  @IsOptional()
  bnName?: string;

  @ApiPropertyOptional({ example: 'Dhaka' })
  @IsString()
  @IsOptional()
  enName?: string;
}

// =======================
// District DTOs
// =======================

export class CreateDistrictDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  divisionId: number;

  @ApiProperty({ example: 'ফরিদপুর' })
  @IsString()
  @IsNotEmpty()
  bnName: string;

  @ApiPropertyOptional({ example: 'Faridpur' })
  @IsString()
  @IsOptional()
  enName?: string;
}

export class UpdateDistrictDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  divisionId?: number;

  @ApiPropertyOptional({ example: 'ফরিদপুর' })
  @IsString()
  @IsOptional()
  bnName?: string;

  @ApiPropertyOptional({ example: 'Faridpur' })
  @IsString()
  @IsOptional()
  enName?: string;
}

// =======================
// Upazila DTOs
// =======================

export class CreateUpazilaDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  districtId: number;

  @ApiProperty({ example: 'ভাঙ্গা' })
  @IsString()
  @IsNotEmpty()
  bnName: string;

  @ApiPropertyOptional({ example: 'Bhanga' })
  @IsString()
  @IsOptional()
  enName?: string;
}

export class UpdateUpazilaDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  districtId?: number;

  @ApiPropertyOptional({ example: 'ভাঙ্গা' })
  @IsString()
  @IsOptional()
  bnName?: string;

  @ApiPropertyOptional({ example: 'Bhanga' })
  @IsString()
  @IsOptional()
  enName?: string;
}

// =======================
// Union DTOs
// =======================

export class CreateUnionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  upazilaId: number;

  @ApiProperty({ example: 'ইউনিয়ন নাম' })
  @IsString()
  @IsNotEmpty()
  bnName: string;

  @ApiProperty({ example: 'Union Name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Union Name' })
  @IsString()
  @IsOptional()
  enName?: string;

  @ApiPropertyOptional({ example: 'City Corporation' })
  @IsString()
  @IsOptional()
  areaType?: string;
}

export class UpdateUnionDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  upazilaId?: number;

  @ApiPropertyOptional({ example: 'ইউনিয়ন নাম' })
  @IsString()
  @IsOptional()
  bnName?: string;

  @ApiPropertyOptional({ example: 'Union Name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Union Name' })
  @IsString()
  @IsOptional()
  enName?: string;

  @ApiPropertyOptional({ example: 'City Corporation' })
  @IsString()
  @IsOptional()
  areaType?: string;
}
