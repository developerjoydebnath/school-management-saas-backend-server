import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSchoolRequestDto } from './dto/create-school-request.dto';
import { SchoolsService } from './schools.service';

/**
 * Public endpoint — no authentication required.
 * This is the form submission endpoint for schools applying to join EduCore.
 */
@ApiTags('public')
@Controller('public/school-request')
export class SchoolsPublicController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit a public school registration request',
    description:
      'Open endpoint — no API key or auth required. A school submits its details and the super admin reviews before activation.',
  })
  async submitRequest(@Body() dto: CreateSchoolRequestDto) {
    return this.schoolsService.submitPublicRequest(dto);
  }
}
