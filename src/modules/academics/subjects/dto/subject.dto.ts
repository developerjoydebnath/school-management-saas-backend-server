import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export enum SubjectTypeEnum {
  MANDATORY = 'MANDATORY',
  OPTIONAL = 'OPTIONAL',
  PRACTICAL = 'PRACTICAL',
  FOURTH_SUBJECT = 'FOURTH_SUBJECT',
  RELIGION = 'RELIGION',
  GROUP_BASED = 'GROUP_BASED',
}

export enum SubjectMarkDivisionEnum {
  WRITTEN = 'WRITTEN',
  WRITTEN_MCQ = 'WRITTEN_MCQ',
  WRITTEN_MCQ_PRACTICAL = 'WRITTEN_MCQ_PRACTICAL',
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreateSubjectDto {
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
  @MaxLength(50)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  boardCode?: string;

  @IsEnum(SubjectTypeEnum)
  @IsOptional()
  type?: SubjectTypeEnum;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  group?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  paperCount?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  fullMarks?: number;

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
  theoryMarks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

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
  status?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSubjectDto {
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
  @MaxLength(50)
  code?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  boardCode?: string;

  @IsEnum(SubjectTypeEnum)
  @IsOptional()
  type?: SubjectTypeEnum;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  group?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  paperCount?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  fullMarks?: number;

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
  theoryMarks?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

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
  status?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
