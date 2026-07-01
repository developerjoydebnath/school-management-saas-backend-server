import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  @IsOptional()
  @MaxLength(30)
  employeeCode?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  fullNameBn?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  fatherName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  motherName?: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  dateOfBirth: Date;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  gender: string;

  @IsString()
  @IsOptional()
  @MaxLength(5)
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  religion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  nationality?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  maritalStatus?: string;

  @IsString()
  @IsOptional()
  photoMediaId?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  photoPlaceholder?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  nid?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  birthCertificateNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  passportNo?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?:\+88|88)?01[3-9]\d{8}$/, {
    message: 'Invalid Bangladeshi phone number',
  })
  @MaxLength(20)
  phone: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  alternatePhone?: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @IsNumber()
  @IsOptional()
  divisionId?: number;

  @IsNumber()
  @IsOptional()
  districtId?: number;

  @IsNumber()
  @IsOptional()
  upazilaId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  postCode?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  permanentAddress?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsNotEmpty()
  designationId: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsBoolean()
  @IsOptional()
  isHeadOfInstitution?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  employmentType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  status?: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  joiningDate: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  confirmationDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  resignationDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  retirementDate?: Date;

  @IsString()
  @IsOptional()
  exitReason?: string;

  @IsBoolean()
  @IsOptional()
  isMpoListed?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  mpoIndexNo?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  mpoIncludedAt?: Date;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  mpoCategory?: string;

  @IsBoolean()
  @IsOptional()
  ntrcaRegistered?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  ntrcaRegNo?: string;

  @IsNumber()
  @IsOptional()
  ntrcaRegYear?: number;

  @IsString()
  @IsOptional()
  ntrcaCertificateMediaId?: string;

  @IsString()
  @IsOptional()
  ntrcaCertificateUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  ntrcaSubject?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  banbeisTeacherId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  highestQualification?: string;

  @IsOptional()
  qualificationDetails?: any;

  @IsOptional()
  professionalQualifications?: any;

  @IsString()
  @IsOptional()
  primarySubjectId?: string;

  @IsOptional()
  specializationSubjects?: any;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  salaryGrade?: string;

  @IsNumber()
  @IsOptional()
  basicSalary?: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  bankAccountNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankBranch?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  mobileWalletNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  mobileWalletType?: string;

  @IsNumber()
  @IsOptional()
  yearsOfExperience?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  previousInstitution?: string;

  @IsString()
  @IsOptional()
  globalPersonId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(63)
  transferredFrom?: string;

  @IsString()
  @IsOptional()
  @MaxLength(63)
  transferredTo?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  transferDate?: Date;

  @IsOptional()
  documents?: any;

  @IsBoolean()
  @IsOptional()
  isHafiz?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  qiratGrade?: string;

  @IsString()
  @IsOptional()
  joiningSessionId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateTeacherDto {
  @IsString()
  @IsOptional()
  @MaxLength(30)
  employeeCode?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  fullName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  fullNameBn?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  fatherName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  motherName?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dateOfBirth?: Date;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  gender?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5)
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  religion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  nationality?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  maritalStatus?: string;

  @IsString()
  @IsOptional()
  photoMediaId?: string | null;

  @IsString()
  @IsOptional()
  photoUrl?: string | null;

  @IsString()
  @IsOptional()
  photoPlaceholder?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  nid?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  birthCertificateNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  passportNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  alternatePhone?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @IsNumber()
  @IsOptional()
  divisionId?: number | null;

  @IsNumber()
  @IsOptional()
  districtId?: number | null;

  @IsNumber()
  @IsOptional()
  upazilaId?: number | null;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  postCode?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  permanentAddress?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number | null;

  @IsNumber()
  @IsOptional()
  longitude?: number | null;

  @IsString()
  @IsOptional()
  designationId?: string;

  @IsString()
  @IsOptional()
  departmentId?: string | null;

  @IsBoolean()
  @IsOptional()
  isHeadOfInstitution?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  employmentType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  status?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  joiningDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  confirmationDate?: Date | null;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  resignationDate?: Date | null;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  retirementDate?: Date | null;

  @IsString()
  @IsOptional()
  exitReason?: string;

  @IsBoolean()
  @IsOptional()
  isMpoListed?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  mpoIndexNo?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  mpoIncludedAt?: Date | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  mpoCategory?: string;

  @IsBoolean()
  @IsOptional()
  ntrcaRegistered?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  ntrcaRegNo?: string;

  @IsNumber()
  @IsOptional()
  ntrcaRegYear?: number | null;

  @IsString()
  @IsOptional()
  ntrcaCertificateMediaId?: string | null;

  @IsString()
  @IsOptional()
  ntrcaCertificateUrl?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  ntrcaSubject?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  banbeisTeacherId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  highestQualification?: string;

  @IsOptional()
  qualificationDetails?: any;

  @IsOptional()
  professionalQualifications?: any;

  @IsString()
  @IsOptional()
  primarySubjectId?: string | null;

  @IsOptional()
  specializationSubjects?: any;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  salaryGrade?: string;

  @IsNumber()
  @IsOptional()
  basicSalary?: number | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  bankAccountNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankBranch?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  mobileWalletNo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  mobileWalletType?: string;

  @IsNumber()
  @IsOptional()
  yearsOfExperience?: number | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  previousInstitution?: string;

  @IsString()
  @IsOptional()
  globalPersonId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(63)
  transferredFrom?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(63)
  transferredTo?: string | null;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  transferDate?: Date | null;

  @IsOptional()
  documents?: any;

  @IsBoolean()
  @IsOptional()
  isHafiz?: boolean | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  qiratGrade?: string;

  @IsString()
  @IsOptional()
  joiningSessionId?: string | null;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class TeacherFilterDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  designationId?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  divisionId?: string;

  @IsString()
  @IsOptional()
  districtId?: string;

  @IsString()
  @IsOptional()
  upazilaId?: string;

  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  employmentType?: string;

  @IsString()
  @IsOptional()
  primarySubjectId?: string;

  @IsString()
  @IsOptional()
  isMpoListed?: string;

  @IsString()
  @IsOptional()
  ntrcaRegistered?: string;
}

export class UpdateTeacherStatusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  status: string;
}
