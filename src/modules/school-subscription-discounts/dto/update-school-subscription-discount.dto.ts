import { PartialType } from '@nestjs/swagger';
import { CreateSchoolSubscriptionDiscountDto } from './create-school-subscription-discount.dto';

export class UpdateSchoolSubscriptionDiscountDto extends PartialType(
  CreateSchoolSubscriptionDiscountDto,
) {}
