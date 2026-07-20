import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { SubjectMarkDivisionEnum } from '../../../academics/subjects/dto/subject.dto';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export enum ExamTypeEnum {
  UNIT_TEST = 'UNIT_TEST',
  CLASS_TEST = 'CLASS_TEST',
  FIRST_TERM = 'FIRST_TERM',
  HALF_YEARLY = 'HALF_YEARLY',
  ANNUAL = 'ANNUAL',
  FINAL = 'FINAL',
  MODEL_TEST = 'MODEL_TEST',
  MOCK_TEST = 'MOCK_TEST',
  PRE_TEST = 'PRE_TEST',
  CUSTOM = 'CUSTOM',
}

export enum ExamStatusEnum {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum ExamSubjectStatusEnum {
  SCHEDULED = 'SCHEDULED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
}

export class CreateExamDto {
  @Matches(UUID_REGEX, { message: 'sessionId must be a UUID' })
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  nameBn?: string;

  @IsEnum(ExamTypeEnum)
  @IsOptional()
  type?: ExamTypeEnum;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(ExamStatusEnum)
  @IsOptional()
  status?: ExamStatusEnum;

  @IsArray()
  @ArrayUnique()
  @Matches(UUID_REGEX, {
    each: true,
    message: 'each value in classIds must be a UUID',
  })
  classIds: string[];

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  instructionsBn?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  gradingScale?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  defaultTotalMarks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  defaultPassMarks?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateExamDto {
  @Matches(UUID_REGEX, { message: 'sessionId must be a UUID' })
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  nameBn?: string;

  @IsEnum(ExamTypeEnum)
  @IsOptional()
  type?: ExamTypeEnum;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(ExamStatusEnum)
  @IsOptional()
  status?: ExamStatusEnum;

  @IsArray()
  @ArrayUnique()
  @Matches(UUID_REGEX, {
    each: true,
    message: 'each value in classIds must be a UUID',
  })
  @IsOptional()
  classIds?: string[];

  @IsString()
  @IsOptional()
  instructions?: string;

  @IsString()
  @IsOptional()
  instructionsBn?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  gradingScale?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  defaultTotalMarks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  defaultPassMarks?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateExamSubjectDto {
  @IsDateString()
  @IsOptional()
  examDate?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  startTime?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMins?: number;

  @Matches(UUID_REGEX, { message: 'classRoomId must be a UUID' })
  @IsOptional()
  classRoomId?: string;

  @Matches(UUID_REGEX, { message: 'invigilatorId must be a UUID' })
  @IsOptional()
  invigilatorId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  totalMarks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  passMarks?: number;

  @IsEnum(SubjectMarkDivisionEnum)
  @IsOptional()
  markDivision?: SubjectMarkDivisionEnum;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  writtenMarks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  writtenPassMarks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  mcqMarks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  mcqPassMarks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  practicalMarks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  practicalPassMarks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  caMarks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  caPassMarks?: number;

  @IsEnum(ExamSubjectStatusEnum)
  @IsOptional()
  status?: ExamSubjectStatusEnum;
}
