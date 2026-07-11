import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExamSubjectStatusEnum } from '../../exams/dto/exam.dto';

export class ExamRoutineSubjectDto {
  @IsUUID()
  id: string;

  @IsDateString()
  @IsOptional()
  examDate?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  startTime?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMins: number;

  @IsUUID()
  @IsOptional()
  classRoomId?: string | null;

  @IsUUID()
  @IsOptional()
  invigilatorId?: string | null;

  @IsEnum(ExamSubjectStatusEnum)
  status: ExamSubjectStatusEnum;
}

export class SaveExamRoutineDto {
  @IsUUID()
  examId: string;

  @IsUUID()
  classId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamRoutineSubjectDto)
  subjects: ExamRoutineSubjectDto[];
}
