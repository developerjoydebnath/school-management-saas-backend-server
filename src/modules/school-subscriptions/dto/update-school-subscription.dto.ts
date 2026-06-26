import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSchoolSubscriptionDto } from './create-school-subscription.dto';

export class UpdateSchoolSubscriptionDto extends PartialType(
  OmitType(CreateSchoolSubscriptionDto, ['schoolId'] as const),
) {}
