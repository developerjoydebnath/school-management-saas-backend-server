import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateSchoolRequestDto {
  @ApiProperty({ example: 'Dhaka Model High School' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  schoolName: string;

  @ApiPropertyOptional({
    example: 'DMHS',
    description:
      'Optional requested short code. If omitted, the platform generates one.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Z0-9]{2,10}$/i, {
    message: 'schoolShortCode must be 2-10 letters or numbers',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  schoolShortCode?: string;

  @ApiProperty({
    enum: ['school', 'madrasa', 'college', 'university_college'],
    example: 'school',
  })
  @IsString()
  @IsIn(['school', 'madrasa', 'college', 'university_college'])
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
  @IsInt()
  @Type(() => Number)
  upazilaId?: number;

  @ApiPropertyOptional({ example: '1205' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postCode?: string;

  @ApiPropertyOptional({ example: 'Road 27, House 12, Dhanmondi' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

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

  @ApiPropertyOptional({ example: 'dhakamodel.edu.bd' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;

  @ApiPropertyOptional({ example: 'ঢাকা মডেল হাই স্কুল' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  schoolNameBn?: string;

  @ApiPropertyOptional({ example: '028812345' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'https://dhakamodel.edu.bd' })
  @IsOptional()
  @IsString() // changed to IsString to be consistent, but usually IsUrl
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  mpoStatus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  banbeis?: string;

  @ApiPropertyOptional({ example: 1995 })
  @IsOptional()
  establishedYear?: number;

  // ── Government & Regulatory ────────────────────────────────
  @ApiPropertyOptional({ example: 'school_managing_committee' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  governingBodyType?: string;

  @ApiPropertyOptional({ example: 'recognized' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  recognitionStatus?: string;

  @ApiPropertyOptional({ example: 'DSHE' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  recognizedBy?: string;

  @ApiPropertyOptional({ example: 'Dhaka Board' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  affiliationBoard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  affiliationNo?: string;

  // ── Academic Structure ─────────────────────────────────────
  @ApiPropertyOptional({ example: 'bangla' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  medium?: string;

  @ApiPropertyOptional({ type: [String], example: ['primary', 'secondary'] })
  @IsOptional()
  educationLevel?: string[];

  @ApiPropertyOptional({ example: 'day' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  shift?: string;

  @ApiPropertyOptional()
  @IsOptional()
  hasHostel?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  hasPermanentCampus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  hostelCapacity?: number;

  // ── Head of Institution ────────────────────────────────────
  @ApiPropertyOptional({ example: 'Headmaster' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  headTeacherTitle?: string;

  // ── Capacity & Statistics ──────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  totalRooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  totalStudentCapacity?: number;

  // ── Social & Public Links ──────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  facebookPage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  youtubeChannel?: string;

  // ── Branding ───────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoPlaceholder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bannerUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerPlaceholder?: string;
}
