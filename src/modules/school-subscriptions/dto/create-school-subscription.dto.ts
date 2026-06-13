import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanBillingCycle, SubscriptionStatus } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateSchoolSubscriptionDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  schoolId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  planId: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  startsAt: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  trialEndsAt?: string;

  @ApiPropertyOptional({
    enum: SubscriptionStatus,
    default: SubscriptionStatus.trial,
  })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

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
  @IsNumber()
  @Min(0)
  @IsOptional()
  discountPct?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  discountNote?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: any;
}
