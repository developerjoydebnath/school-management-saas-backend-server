import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanBillingCycle } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSubscriptionPlanDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tagline?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  priceBdt?: number;

  @ApiPropertyOptional({
    enum: PlanBillingCycle,
    default: PlanBillingCycle.monthly,
  })
  @IsEnum(PlanBillingCycle)
  @IsOptional()
  billingCycle?: PlanBillingCycle;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  setupFeeBdt?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  trialDays?: number;

  @ApiPropertyOptional({ default: 7 })
  @IsInt()
  @Min(0)
  @IsOptional()
  gracePeriodDays?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxStudents?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxTeachers?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxStaff?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxClasses?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxSubjects?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  maxBranches?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  storageGb?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  freeStudentLimit?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasSmsNotifications?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasEmailNotifications?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasParentPortal?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasOnlineAdmission?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasOnlineFeePayment?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasResultPublishing?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasCustomDomain?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasApiAccess?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasAdvancedReports?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasPrioritySupport?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hasDedicatedAccountManager?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
