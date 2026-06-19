import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  permissionName: string;

  @IsString()
  groupName: string;

  @IsString()
  permissionKey: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  moduleName?: string[];
}

export class UpdatePermissionDto {
  @IsString()
  @IsOptional()
  permissionName?: string;

  @IsString()
  @IsOptional()
  groupName?: string;

  @IsString()
  @IsOptional()
  permissionKey?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  moduleName?: string[];
}
