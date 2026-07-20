import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class SessionClassSectionRowDto {
  @IsUUID()
  @IsOptional()
  sectionId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  capacity?: number;

  @IsUUID()
  @IsOptional()
  shiftId?: string;

  @IsUUID()
  @IsOptional()
  roomId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class UpsertSessionClassSetupDto {
  @IsUUID()
  sessionId: string;

  @IsUUID()
  classId: string;

  @IsBoolean()
  hasSections: boolean;

  @ValidateNested()
  @Type(() => SessionClassSectionRowDto)
  @IsOptional()
  classLevel?: SessionClassSectionRowDto;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SessionClassSectionRowDto)
  @IsOptional()
  sections?: SessionClassSectionRowDto[];
}
