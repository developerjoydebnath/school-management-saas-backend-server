import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateStudentDto {
  [key: string]: any;
}

export class UpdateStudentStatusDto {
  @IsString()
  @MaxLength(20)
  status: string;

  @IsString()
  @IsOptional()
  statusReason?: string;
}

export class StudentByClassQueryDto {
  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @IsUUID()
  @IsOptional()
  sectionId?: string;
}
