import { Type } from 'class-transformer';
import {
  Allow,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAdmissionApplicationDto {
  @IsUUID()
  @IsOptional()
  sessionId: string;

  @Allow()
  @IsOptional()
  session?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  studentNameEn: string;

  @Allow()
  @IsOptional()
  fullName?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  studentNameBn?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth: string;

  @Allow()
  @IsOptional()
  dob?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  gender: string;

  @IsUUID()
  @IsOptional()
  applyingClassId: string;

  @Allow()
  @IsOptional()
  class?: string;

  @Allow()
  @IsOptional()
  classId?: string;

  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @Allow()
  @IsOptional()
  section?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  admissionType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  fatherName: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  fatherMobile: string;

  @Allow()
  @IsOptional()
  mobile?: string;

  @Allow()
  @IsOptional()
  contact?: string;

  @IsString()
  @IsOptional()
  admissionMode?: string;

  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  completionPercent?: number;

  @IsObject()
  @IsOptional()
  customData?: any;

  @Allow()
  @IsOptional()
  documents?: any;

  @Allow()
  @IsOptional()
  specialQuota?: any;

  @Allow()
  @IsOptional()
  manualDiscountType?: string;

  @Allow()
  @IsOptional()
  manualDiscountScope?: string;

  @Allow()
  @IsOptional()
  manualDiscountValue?: any;

  @Allow()
  @IsOptional()
  manualDiscountReason?: string;

  @Allow()
  @IsOptional()
  referenceName?: string;

  @Allow()
  @IsOptional()
  referenceMobile?: string;

  @Allow()
  @IsOptional()
  referenceUserId?: string;

  [key: string]: any;
}

export class UpdateAdmissionApplicationDto {
  [key: string]: any;
}

export class ApproveAdmissionDto {
  @IsString()
  @MaxLength(20)
  @IsOptional()
  rollNumber?: string;

  @IsUUID()
  @IsOptional()
  sectionId?: string;
}

export class RejectAdmissionDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}

export class WaitlistAdmissionDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  waitlistRank?: number;
}
