import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Used when a super admin creates a school directly.
 * Identical fields to the public request but the school
 * becomes active immediately (no approval step).
 */
export class CreateSchoolAdminDto {
  @ApiProperty({ example: 'Sylhet Government College' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  schoolName: string;

  @ApiProperty({
    enum: [
      'bangla_medium',
      'english_medium',
      'madrasa',
      'college',
      'university_college',
    ],
    example: 'college',
  })
  @IsString()
  @IsIn([
    'bangla_medium',
    'english_medium',
    'madrasa',
    'college',
    'university_college',
  ])
  schoolType: string;

  @ApiProperty({ example: 'Prof. Rahim Uddin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  adminName: string;

  @ApiProperty({ example: 'principal@sylhetgov.edu.bd' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  contactEmail: string;

  @ApiProperty({ example: '01800000001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  contactPhone: string;

  @ApiProperty({ example: 3 })
  @IsNotEmpty()
  divisionId: number;

  @ApiProperty({ example: 47 })
  @IsNotEmpty()
  districtId: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  upazilaId?: number;

  @ApiPropertyOptional({ example: 'Zindabazar, Sylhet' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '654321' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  eiin?: string;

  @ApiPropertyOptional({ example: 'REG-2024-005' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNo?: string;

  @ApiPropertyOptional({
    enum: ['basic', 'standard', 'premium'],
    default: 'standard',
  })
  @IsOptional()
  @IsString()
  @IsIn(['basic', 'standard', 'premium'])
  plan?: string;

  @ApiPropertyOptional({ example: 'sylhetgov.edu.bd' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;
}
