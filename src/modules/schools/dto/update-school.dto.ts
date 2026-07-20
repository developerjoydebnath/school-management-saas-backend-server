import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  IsUrl,
  ValidateIf,
} from 'class-validator';

export class UpdateSchoolDto {
  @ApiPropertyOptional({ example: 'Dhaka Model High School' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  schoolName?: string;

  @ApiPropertyOptional({
    example: 'DMHS',
    description:
      'Immutable short code used as the prefix segment in generated school usernames.',
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

  @ApiPropertyOptional({ example: 'ঢাকা মডেল হাই স্কুল' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  schoolNameBn?: string;

  @ApiPropertyOptional({
    enum: ['school', 'madrasa', 'college', 'university_college'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['school', 'madrasa', 'college', 'university_college'])
  schoolType?: string;

  // ── Location ───────────────────────────────────────────────
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  divisionId?: number;

  @ApiPropertyOptional({ example: 47 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  districtId?: number;

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

  // ── Contact ────────────────────────────────────────────────
  @ApiPropertyOptional({ example: 'principal@dhakamodel.edu.bd' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional({ example: '01700000000' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @ApiPropertyOptional({ example: '028812345' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'https://dhakamodel.edu.bd' })
  @IsOptional()
  @ValidateIf((e) => e.website !== '')
  @IsUrl()
  @MaxLength(255)
  website?: string;

  // ── Official information ────────────────────────────────────
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mpoStatus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  banbeis?: string;

  @ApiPropertyOptional({ example: 1995 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
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
  @IsArray()
  @IsString({ each: true })
  educationLevel?: string[];

  @ApiPropertyOptional({ example: 'day' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  shift?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasHostel?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasPermanentCampus?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
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
  @IsInt()
  @Type(() => Number)
  totalRooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  totalStudentCapacity?: number;

  // ── Social & Public Links ──────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((e) => e.facebookPage !== '')
  @IsUrl()
  @MaxLength(500)
  facebookPage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((e) => e.youtubeChannel !== '')
  @IsUrl()
  @MaxLength(500)
  youtubeChannel?: string;

  // ── Domain ─────────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCustomDomainEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;

  // ── Branding ───────────────────────────────────────────────
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((e) => e.logoUrl !== '')
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoPlaceholder?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((e) => e.bannerUrl !== '')
  @IsString()
  @MaxLength(500)
  bannerUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerPlaceholder?: string;
}
