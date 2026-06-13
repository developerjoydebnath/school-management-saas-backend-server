import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateSchoolRequestDto {
  @ApiProperty({ example: 'Dhaka Model High School' })
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
    example: 'bangla_medium',
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

  @ApiProperty({ example: 'Md. Kamal Hossain' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  adminName: string;

  @ApiProperty({ example: 'principal@dhakamodel.edu.bd' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  contactEmail: string;

  @ApiProperty({ example: '01700000000' })
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

  @ApiPropertyOptional({ example: 'Road 27, House 12, Dhanmondi' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  eiin?: string;

  @ApiPropertyOptional({ example: 'REG-2024-001' })
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

  @ApiPropertyOptional({ example: 'dhakamodel.edu.bd' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;
}
