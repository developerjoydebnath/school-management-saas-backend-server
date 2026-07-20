import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateMailConfigDto {
  @IsOptional()
  @IsIn(['smtp', 'gmail'])
  provider?: string;

  @IsOptional()
  @IsIn(['system', 'own'])
  mode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  smtpHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  smtpUser?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  smtpPassword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  fromName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  fromEmail?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  replyToEmail?: string;
}

export class UpdateMailStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class TestMailConfigDto {
  @IsEmail()
  @MaxLength(255)
  to!: string;
}
