import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export enum SyllabusStatusEnum {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class SyllabusTopicDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  titleBn?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  estimatedClasses?: number;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  weightPercent?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progressPercent?: number;
}

export class SyllabusChapterDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  chapterNo?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  titleBn?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  pageRange?: string;

  @IsString()
  @IsOptional()
  learningOutcome?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  weightPercent?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyllabusTopicDto)
  @IsOptional()
  topics?: SyllabusTopicDto[];
}

export class SyllabusSubjectDto {
  @IsUUID('4')
  subjectId: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsUUID('4')
  @IsOptional()
  teacherId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyllabusChapterDto)
  @IsOptional()
  chapters?: SyllabusChapterDto[];
}

export class CreateSyllabusDto {
  @IsUUID('4')
  sessionId: string;

  @IsUUID('4')
  examId: string;

  @IsUUID('4')
  classId: string;

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @IsOptional()
  sectionIds?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsEnum(SyllabusStatusEnum)
  @IsOptional()
  status?: SyllabusStatusEnum;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyllabusSubjectDto)
  @IsOptional()
  subjects?: SyllabusSubjectDto[];
}

export class UpdateSyllabusDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsEnum(SyllabusStatusEnum)
  @IsOptional()
  status?: SyllabusStatusEnum;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyllabusSubjectDto)
  @IsOptional()
  subjects?: SyllabusSubjectDto[];
}

export class ToggleSyllabusTopicDto {
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progressPercent?: number;
}
