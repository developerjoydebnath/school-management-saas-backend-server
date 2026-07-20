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
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  @Matches(UUID_REGEX, { message: 'subjectId must be a UUID' })
  subjectId: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @Matches(UUID_REGEX, { message: 'teacherId must be a UUID' })
  @IsOptional()
  teacherId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyllabusChapterDto)
  @IsOptional()
  chapters?: SyllabusChapterDto[];
}

export class CreateSyllabusDto {
  @Matches(UUID_REGEX, { message: 'sessionId must be a UUID' })
  sessionId: string;

  @Matches(UUID_REGEX, { message: 'examId must be a UUID' })
  examId: string;

  @Matches(UUID_REGEX, { message: 'classId must be a UUID' })
  classId: string;

  @IsArray()
  @ArrayUnique()
  @Matches(UUID_REGEX, {
    each: true,
    message: 'each value in sectionIds must be a UUID',
  })
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
