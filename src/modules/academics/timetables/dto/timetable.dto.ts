import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TimetableColumnDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsIn(['Period', 'Break', 'Lunch', 'Assembly', 'Activity', 'Prayer'])
  type: string;
}

export class SaveTimetableDto {
  @IsUUID()
  sessionId: string;

  @IsUUID()
  classId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sectionIds?: string[];

  @IsOptional()
  @IsString()
  title?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  days: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TimetableColumnDto)
  columns: TimetableColumnDto[];

  @IsObject()
  cells: Record<string, unknown>;
}
