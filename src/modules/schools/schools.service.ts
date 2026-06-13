import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { School, SchoolType } from '@prisma/client';
import { PrismaService } from '../../cores/prisma.service';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import { CreateSchoolRequestDto } from './dto/create-school-request.dto';
import { SchoolsActivationService } from './schools.activation.service';
import { SchoolsMigrationService } from './schools.migration.service';

export interface SchoolListQuery {
  status?: string;
  page?: number;
  limit?: number;
  districtId?: number;
  schoolType?: string;
}

@Injectable()
export class SchoolsService {
  private readonly logger = new Logger(SchoolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activationService: SchoolsActivationService,
    private readonly migrationService: SchoolsMigrationService,
  ) {}

  // ─── Public request form ──────────────────────────────────────────────────────

  /**
   * Scenario A — public submits a request form.
   * Creates a school with status: 'pending'.
   * Super admin reviews later.
   */
  async submitPublicRequest(
    dto: CreateSchoolRequestDto,
  ): Promise<{ message: string }> {
    const slug = await this.generateUniqueSlug(dto.schoolName);

    await this.prisma.school.create({
      data: {
        schoolName: dto.schoolName,
        schoolSlug: slug,
        schoolType: dto.schoolType as SchoolType,
        divisionId: dto.divisionId,
        districtId: dto.districtId,
        upazilaId: dto.upazilaId,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        address: dto.address,
        eiin: dto.eiin,
        registrationNo: dto.registrationNo,
        isCustomDomainEnabled: !!dto.customDomain,
        customDomain: dto.customDomain,
        notes: JSON.stringify({
          adminName: dto.adminName,
          plan: dto.plan ?? 'standard',
        }),
        status: 'pending',
        createdBy: 'public',
      },
    });

    this.logger.log(
      `Public request submitted for: ${dto.schoolName} (slug: ${slug})`,
    );

    // Send confirmation email (fire-and-forget)
    this.activationService
      .sendConfirmationEmail(dto.schoolName, dto.adminName, dto.contactEmail)
      .catch((err) =>
        this.logger.error('Confirmation email failed:', err.message),
      );

    return {
      message:
        'Your request has been submitted successfully. Our team will review it within 2–3 business days.',
    };
  }

  // ─── Super admin operations ───────────────────────────────────────────────────

  /**
   * Scenario B — super admin creates a school directly.
   * Inserts with status 'active' and immediately runs activation pipeline.
   */
  async createByAdmin(
    dto: CreateSchoolAdminDto,
    adminId: string,
  ): Promise<{ message: string; data: School }> {
    const slug = await this.generateUniqueSlug(dto.schoolName);

    // Insert first so we have an ID for the activation pipeline
    const school = await this.prisma.school.create({
      data: {
        schoolName: dto.schoolName,
        schoolSlug: slug,
        schoolType: dto.schoolType as SchoolType,
        divisionId: dto.divisionId,
        districtId: dto.districtId,
        upazilaId: dto.upazilaId,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        address: dto.address,
        eiin: dto.eiin,
        registrationNo: dto.registrationNo,
        isCustomDomainEnabled: !!dto.customDomain,
        customDomain: dto.customDomain,
        notes: JSON.stringify({
          adminName: dto.adminName,
          plan: dto.plan ?? 'standard',
        }),
        status: 'pending', // will be updated to 'active' inside activateSchool
        createdBy: 'superadmin',
        createdById: adminId,
      },
    });

    // Run the activation pipeline immediately
    await this.activationService.activateSchool(school, adminId, dto.adminName);

    const activated = await this.prisma.school.findUnique({
      where: { id: school.id },
    });

    return {
      message: `School "${dto.schoolName}" has been created and activated successfully.`,
      data: activated!,
    };
  }

  /**
   * Scenario A step 2 — super admin approves a pending request.
   */
  async approveSchool(
    id: string,
    adminId: string,
  ): Promise<{ message: string; data: School }> {
    const school = await this.findOneOrFail(id);

    if (school.status !== 'pending') {
      throw new ConflictException(
        `Cannot approve a school with status "${school.status}". Only pending schools can be approved.`,
      );
    }

    let adminName = 'School Admin';
    try {
      if (school.notes) {
        const metadata = JSON.parse(school.notes);
        if (metadata.adminName) adminName = metadata.adminName;
      }
    } catch (e) {
      // Ignore parsing error
      console.error(e);
    }

    await this.activationService.activateSchool(school, adminId, adminName);

    const activated = await this.prisma.school.findUnique({
      where: { id },
    });

    return {
      message: `School "${school.schoolName}" has been approved and activated.`,
      data: activated!,
    };
  }

  /**
   * Scenario C — super admin rejects a pending request.
   */
  async rejectSchool(
    id: string,
    adminId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    const school = await this.findOneOrFail(id);

    if (school.status !== 'pending') {
      throw new ConflictException(
        `Cannot reject a school with status "${school.status}". Only pending schools can be rejected.`,
      );
    }

    await this.prisma.school.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedReason: reason ?? null,
      },
    });

    this.logger.log(
      `School "${school.schoolName}" rejected by admin ${adminId}`,
    );

    let adminName = 'Applicant';
    try {
      if (school.notes) {
        const metadata = JSON.parse(school.notes);
        if (metadata.adminName) adminName = metadata.adminName;
      }
    } catch (e) {
      // Ignore parsing error
      console.error(e);
    }

    // Send rejection email (fire-and-forget)
    this.activationService
      .sendRejectionEmail(school, adminName, reason)
      .catch((err) =>
        this.logger.error('Rejection email failed:', err.message),
      );

    return { message: `School "${school.schoolName}" has been rejected.` };
  }

  /**
   * Scenario D — super admin suspends an active school.
   * Deactivates all users in that schema — login fails for them.
   * Schema and data are untouched.
   */
  async suspendSchool(id: string): Promise<{ message: string }> {
    const school = await this.findOneOrFail(id);

    if (school.status !== 'active') {
      throw new ConflictException(
        `Cannot suspend a school with status "${school.status}". Only active schools can be suspended.`,
      );
    }

    const schemaName = this.migrationService.toSchemaName(school.schoolSlug);

    await this.prisma.$transaction(async (tx) => {
      // Deactivate all users belonging to this tenant schema
      await tx.user.updateMany({
        where: { schemaName: schemaName },
        data: { isActive: false },
      });

      await tx.school.update({
        where: { id },
        data: { status: 'suspended' },
      });
    });

    this.logger.log(
      `School "${school.schoolName}" suspended. All users deactivated.`,
    );
    return {
      message: `School "${school.schoolName}" has been suspended. All user access has been revoked.`,
    };
  }

  /**
   * Scenario E — super admin reactivates a suspended school.
   * Re-enables all users. Schema was never touched.
   */
  async reactivateSchool(
    id: string,
    adminId: string,
  ): Promise<{ message: string }> {
    const school = await this.findOneOrFail(id);

    if (school.status !== 'suspended') {
      throw new ConflictException(
        `Cannot reactivate a school with status "${school.status}". Only suspended schools can be reactivated.`,
      );
    }

    const schemaName = this.migrationService.toSchemaName(school.schoolSlug);

    await this.prisma.$transaction(async (tx) => {
      // Re-enable all users for this tenant
      await tx.user.updateMany({
        where: { schemaName: schemaName },
        data: { isActive: true },
      });

      await tx.school.update({
        where: { id },
        data: {
          status: 'active',
          activatedAt: new Date(),
          activatedBy: adminId,
        },
      });
    });

    this.logger.log(
      `School "${school.schoolName}" reactivated by admin ${adminId}`,
    );
    return {
      message: `School "${school.schoolName}" has been reactivated. All user access restored.`,
    };
  }

  // ─── Query methods ────────────────────────────────────────────────────────────

  async findAll(query: SchoolListQuery): Promise<{
    data: { items: School[]; meta: object };
  }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (query.status) where.status = query.status;
    if (query.districtId) where.districtId = query.districtId;
    if (query.schoolType) where.schoolType = query.schoolType as SchoolType;

    const [items, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.school.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: {
        items,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    };
  }

  async findOne(id: string): Promise<School> {
    return this.findOneOrFail(id);
  }

  // ─── Internal helpers ─────────────────────────────────────────────────────────

  private async findOneOrFail(id: string): Promise<School> {
    const school = await this.prisma.school.findUnique({
      where: { id },
    });
    if (!school) {
      throw new NotFoundException(`School with ID "${id}" not found.`);
    }
    return school;
  }

  /**
   * Generates a URL-safe slug from the school name.
   * Appends -2, -3 etc. if slug already taken.
   */
  async generateUniqueSlug(schoolName: string): Promise<string> {
    const base = schoolName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric → hyphen
      .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
      .substring(0, 50); // max 50 chars for the base

    let slug = base;
    let counter = 1;

    while (true) {
      const exists = await this.prisma.school.findUnique({
        where: { schoolSlug: slug },
      });
      if (!exists) return slug;
      slug = `${base}-${counter}`;
      counter++;
    }
  }
}
