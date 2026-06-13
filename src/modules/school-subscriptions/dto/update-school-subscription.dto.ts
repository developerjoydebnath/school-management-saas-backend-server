import { PartialType } from '@nestjs/swagger';
import { CreateSchoolSubscriptionDto } from './create-school-subscription.dto';

export class UpdateSchoolSubscriptionDto extends PartialType(
  CreateSchoolSubscriptionDto,
) {}
