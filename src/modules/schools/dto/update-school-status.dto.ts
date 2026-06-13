import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectSchoolDto {
  @ApiPropertyOptional({ example: 'Incomplete documentation provided.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
