import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateShiftDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'startTime must be a valid time format (HH:MM or HH:MM:SS)',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'endTime must be a valid time format (HH:MM or HH:MM:SS)',
  })
  endTime: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateShiftDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'startTime must be a valid time format (HH:MM or HH:MM:SS)',
  })
  startTime?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'endTime must be a valid time format (HH:MM or HH:MM:SS)',
  })
  endTime?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
