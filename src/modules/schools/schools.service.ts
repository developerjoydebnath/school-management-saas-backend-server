import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, School, SchoolType } from '@prisma/client';
import { softDelete } from '../../common/utils/soft-delete.extension';
import { PrismaService } from '../../cores/prisma.service';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import { CreateSchoolRequestDto } from './dto/create-school-request.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolsActivationService } from './schools.activation.service';
import { SchoolsMigrationService } from './schools.migration.service';

export interface SchoolListQuery {
  status?: string;
  page?: number;
  limit?: number;
  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
  schoolType?: string;
  affiliationBoard?: string;
  medium?: string;
  shift?: string;
  createdFrom?: string;
  createdTo?: string;
}

const SCHOOL_TYPE_ALIASES: Record<string, string> = {
  school: 'school',
  madrasa: 'madrasa',
  madrasah: 'madrasa',
  college: 'college',
  university_college: 'university_college',
};

function parseCsv(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumberCsv(value?: string): number[] {
  return parseCsv(value)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item));
}

function parseDateFilter(value?: string, endOfDay = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid created date filter: ${value}`);
  }
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
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
  async submitPublicRequest(dto: CreateSchoolRequestDto) {
    const slug = await this.generateUniqueSlug(dto.schoolName);

    try {
      await this.prisma.school.create({
        data: {
        schoolName: dto.schoolName,
        schoolSlug: slug,
        schoolType: dto.schoolType as SchoolType,
        divisionId: dto.divisionId,
        districtId: dto.districtId,
        upazilaId: dto.upazilaId,
        postCode: dto.postCode,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        eiin: dto.eiin,
        registrationNo: dto.registrationNo,
        isCustomDomainEnabled: !!dto.customDomain,
        customDomain: dto.customDomain,
        notes: JSON.stringify({
          adminName: dto.adminName,
        }),
        schoolNameBn: dto.schoolNameBn,
        alternatePhone: dto.alternatePhone,
        website: dto.website,
        mpoStatus: dto.mpoStatus,
        banbeis: dto.banbeis,
        establishedYear: dto.establishedYear,
        governingBodyType: dto.governingBodyType,
        recognitionStatus: dto.recognitionStatus,
        recognizedBy: dto.recognizedBy,
        affiliationBoard: dto.affiliationBoard,
        affiliationNo: dto.affiliationNo,
        medium: dto.medium ?? 'bangla',
        educationLevel: dto.educationLevel ?? [],
        shift: dto.shift ?? 'day',
        hasHostel: dto.hasHostel,
        hasPermanentCampus: dto.hasPermanentCampus,
        hostelCapacity: dto.hostelCapacity,
        headTeacherTitle: dto.headTeacherTitle,
        totalRooms: dto.totalRooms,
        totalStudentCapacity: dto.totalStudentCapacity,
        facebookPage: dto.facebookPage,
        youtubeChannel: dto.youtubeChannel,
        status: 'pending',
        createdBy: 'public',
        logoUrl: dto.logoUrl,
        logoPlaceholder: dto.logoPlaceholder,
        bannerUrl: dto.bannerUrl,
        bannerPlaceholder: dto.bannerPlaceholder,
      },
      });
    } catch (error) {
      this.handleSchoolCreateError(error);
    }

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
      success: true,
      statusCode: 201,
      message:
        'Your request has been submitted successfully. Our team will review it within 2–3 business days.',
      data: null,
      meta: null,
    };
  }

  // ─── Super admin operations ───────────────────────────────────────────────────

  /**
   * Scenario B — super admin creates a school directly.
   * Inserts with status 'active' and immediately runs activation pipeline.
   */
  async createByAdmin(dto: CreateSchoolAdminDto, adminId: string) {
    const slug = await this.generateUniqueSlug(dto.schoolName);

    // Insert first so we have an ID for the activation pipeline
    let school: School;
    try {
      school = await this.prisma.school.create({
        data: {
        schoolName: dto.schoolName,
        schoolSlug: slug,
        schoolType: dto.schoolType as SchoolType,
        divisionId: dto.divisionId,
        districtId: dto.districtId,
        upazilaId: dto.upazilaId,
        postCode: dto.postCode,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        eiin: dto.eiin,
        registrationNo: dto.registrationNo,
        isCustomDomainEnabled: !!dto.customDomain,
        customDomain: dto.customDomain,
        notes: JSON.stringify({
          adminName: dto.adminName,
        }),
        schoolNameBn: dto.schoolNameBn,
        alternatePhone: dto.alternatePhone,
        website: dto.website,
        mpoStatus: dto.mpoStatus,
        banbeis: dto.banbeis,
        establishedYear: dto.establishedYear,
        governingBodyType: dto.governingBodyType,
        recognitionStatus: dto.recognitionStatus,
        recognizedBy: dto.recognizedBy,
        affiliationBoard: dto.affiliationBoard,
        affiliationNo: dto.affiliationNo,
        medium: dto.medium ?? 'bangla',
        educationLevel: dto.educationLevel ?? [],
        shift: dto.shift ?? 'day',
        hasHostel: dto.hasHostel,
        hasPermanentCampus: dto.hasPermanentCampus,
        hostelCapacity: dto.hostelCapacity,
        headTeacherTitle: dto.headTeacherTitle,
        totalRooms: dto.totalRooms,
        totalStudentCapacity: dto.totalStudentCapacity,
        facebookPage: dto.facebookPage,
        youtubeChannel: dto.youtubeChannel,
        status: 'pending',
        createdBy: 'superadmin',
        createdById: adminId,
        logoUrl: dto.logoUrl,
        logoPlaceholder: dto.logoPlaceholder,
        bannerUrl: dto.bannerUrl,
        bannerPlaceholder: dto.bannerPlaceholder,
      },
      });
    } catch (error) {
      this.handleSchoolCreateError(error);
    }

    return {
      success: true,
      statusCode: 201,
      message: `School "${dto.schoolName}" has been created. Proceed to payment for activation.`,
      data: school,
      meta: null,
    };
  }

  /**
   * Generic school update (PATCH).
   */
  async updateSchool(id: string, dto: UpdateSchoolDto) {
    const school = await this.findOneOrFail(id);

    const updated = await this.prisma.school.update({
      where: { id },
      data: {
        ...(dto.schoolName && { schoolName: dto.schoolName }),
        ...(dto.schoolNameBn !== undefined && {
          schoolNameBn: dto.schoolNameBn,
        }),
        ...(dto.schoolType && { schoolType: dto.schoolType as SchoolType }),
        ...(dto.divisionId !== undefined && { divisionId: dto.divisionId }),
        ...(dto.districtId !== undefined && { districtId: dto.districtId }),
        ...(dto.upazilaId !== undefined && { upazilaId: dto.upazilaId }),
        ...(dto.postCode !== undefined && { postCode: dto.postCode }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.contactEmail && { contactEmail: dto.contactEmail }),
        ...(dto.contactPhone && { contactPhone: dto.contactPhone }),
        ...(dto.alternatePhone !== undefined && {
          alternatePhone: dto.alternatePhone,
        }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.eiin !== undefined && { eiin: dto.eiin }),
        ...(dto.registrationNo !== undefined && {
          registrationNo: dto.registrationNo,
        }),
        ...(dto.mpoStatus !== undefined && { mpoStatus: dto.mpoStatus }),
        ...(dto.banbeis !== undefined && { banbeis: dto.banbeis }),
        ...(dto.establishedYear !== undefined && {
          establishedYear: dto.establishedYear,
        }),
        ...(dto.governingBodyType !== undefined && {
          governingBodyType: dto.governingBodyType,
        }),
        ...(dto.recognitionStatus !== undefined && {
          recognitionStatus: dto.recognitionStatus,
        }),
        ...(dto.recognizedBy !== undefined && {
          recognizedBy: dto.recognizedBy,
        }),
        ...(dto.affiliationBoard !== undefined && {
          affiliationBoard: dto.affiliationBoard,
        }),
        ...(dto.affiliationNo !== undefined && {
          affiliationNo: dto.affiliationNo,
        }),
        ...(dto.medium && { medium: dto.medium }),
        ...(dto.educationLevel && { educationLevel: dto.educationLevel }),
        ...(dto.shift && { shift: dto.shift }),
        ...(dto.hasHostel !== undefined && { hasHostel: dto.hasHostel }),
        ...(dto.hasPermanentCampus !== undefined && {
          hasPermanentCampus: dto.hasPermanentCampus,
        }),
        ...(dto.hostelCapacity !== undefined && {
          hostelCapacity: dto.hostelCapacity,
        }),
        ...(dto.headTeacherTitle !== undefined && {
          headTeacherTitle: dto.headTeacherTitle,
        }),
        ...(dto.totalRooms !== undefined && { totalRooms: dto.totalRooms }),
        ...(dto.totalStudentCapacity !== undefined && {
          totalStudentCapacity: dto.totalStudentCapacity,
        }),
        ...(dto.facebookPage !== undefined && {
          facebookPage: dto.facebookPage,
        }),
        ...(dto.youtubeChannel !== undefined && {
          youtubeChannel: dto.youtubeChannel,
        }),
        ...(dto.isCustomDomainEnabled !== undefined && {
          isCustomDomainEnabled: dto.isCustomDomainEnabled,
        }),
        ...(dto.customDomain !== undefined && {
          customDomain: dto.customDomain,
        }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.logoPlaceholder !== undefined && {
          logoPlaceholder: dto.logoPlaceholder,
        }),
        ...(dto.bannerUrl !== undefined && { bannerUrl: dto.bannerUrl }),
        ...(dto.bannerPlaceholder !== undefined && {
          bannerPlaceholder: dto.bannerPlaceholder,
        }),
      },
    });

    this.logger.log(`School "${school.schoolName}" (${id}) updated.`);

    return {
      success: true,
      statusCode: 200,
      message: 'School updated successfully',
      data: updated,
      meta: null,
    };
  }

  /**
   * Scenario A step 2 — super admin approves a pending request.
   */
  async approveSchool(id: string, adminId: string) {
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
      success: true,
      statusCode: 200,
      message: `School "${school.schoolName}" has been approved and activated.`,
      data: activated!,
      meta: null,
    };
  }

  /**
   * Scenario C — super admin rejects a pending request.
   */
  async rejectSchool(id: string, adminId: string, reason?: string) {
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

    return {
      success: true,
      statusCode: 200,
      message: `School "${school.schoolName}" has been rejected.`,
      data: null,
      meta: null,
    };
  }

  /**
   * Scenario D — super admin suspends an active school.
   * Deactivates all users in that schema — login fails for them.
   * Schema and data are untouched.
   */
  async suspendSchool(id: string) {
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
      success: true,
      statusCode: 200,
      message: `School "${school.schoolName}" has been suspended. All user access has been revoked.`,
      data: null,
      meta: null,
    };
  }

  /**
   * Scenario E — super admin reactivates a suspended school.
   * Re-enables all users. Schema was never touched.
   */
  async reactivateSchool(id: string, adminId: string) {
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
      success: true,
      statusCode: 200,
      message: `School "${school.schoolName}" has been reactivated. All user access restored.`,
      data: null,
      meta: null,
    };
  }

  // ─── Query methods ────────────────────────────────────────────────────────────

  async findAll(query: SchoolListQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    const statuses = parseCsv(query.status);
    if (statuses.length === 1) where.status = statuses[0];
    if (statuses.length > 1) where.status = { in: statuses };
    const divisionIds = parseNumberCsv(query.divisionId);
    if (divisionIds.length === 1) where.divisionId = divisionIds[0];
    if (divisionIds.length > 1) where.divisionId = { in: divisionIds };
    const districtIds = parseNumberCsv(query.districtId);
    if (districtIds.length === 1) where.districtId = districtIds[0];
    if (districtIds.length > 1) where.districtId = { in: districtIds };
    const upazilaIds = parseNumberCsv(query.upazilaId);
    if (upazilaIds.length === 1) where.upazilaId = upazilaIds[0];
    if (upazilaIds.length > 1) where.upazilaId = { in: upazilaIds };
    const schoolTypes = parseCsv(query.schoolType).map((type) => {
      const normalized = SCHOOL_TYPE_ALIASES[type];
      if (!normalized) {
        throw new BadRequestException(`Invalid school type filter: ${type}`);
      }
      return normalized as SchoolType;
    });
    if (schoolTypes.length === 1) where.schoolType = schoolTypes[0];
    if (schoolTypes.length > 1) where.schoolType = { in: schoolTypes };
    const affiliationBoards = parseCsv(query.affiliationBoard);
    if (affiliationBoards.length === 1) where.affiliationBoard = affiliationBoards[0];
    if (affiliationBoards.length > 1) where.affiliationBoard = { in: affiliationBoards };
    const mediums = parseCsv(query.medium);
    if (mediums.length === 1) where.medium = mediums[0];
    if (mediums.length > 1) where.medium = { in: mediums };
    const shifts = parseCsv(query.shift);
    if (shifts.length === 1) where.shift = shifts[0];
    if (shifts.length > 1) where.shift = { in: shifts };
    const createdFrom = parseDateFilter(query.createdFrom);
    const createdTo = parseDateFilter(query.createdTo, true);
    if (createdFrom || createdTo) {
      where.createdAt = {
        ...(createdFrom ? { gte: createdFrom } : {}),
        ...(createdTo ? { lte: createdTo } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        include: {
          adminUser: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.school.count({ where }),
    ]);

    const schools = items.map((school) => {
      const profile = school.adminUser?.profile;
      const contactPersonName = profile
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : null;

      return {
        ...school,
        contactPersonName,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message: 'Schools retrieved successfully',
      data: {
        items: schools,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      meta: null,
    };
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        payments: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
        division: true,
        district: true,
        upazila: true,
        bankAccounts: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        },
        adminUser: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException(`School with ID "${id}" not found.`);
    }

    // Since `subscriptions` isn't directly listed in `School` model in Prisma (only payments),
    // we fetch active subscription manually if needed, but if it is in School we could include it.
    // Let's also fetch subscriptions manually to be safe.
    const subscriptions = await this.prisma.schoolSubscription.findMany({
      where: { schoolId: id },
      orderBy: { startsAt: 'desc' },
      include: { plan: true },
    });

    const schoolData = {
      ...school,
      subscriptions,
    };

    if (schoolData.adminUser) {
      delete (schoolData.adminUser as any).password;
      delete (schoolData.adminUser as any).resetOtp;
      delete (schoolData.adminUser as any).resetOtpExpires;
      delete (schoolData.adminUser as any).hashedRefreshToken;
    }

    return {
      success: true,
      statusCode: 200,
      message: 'School retrieved successfully',
      data: schoolData,
      meta: null,
    };
  }

  async remove(id: string) {
    await this.findOneOrFail(id);
    await softDelete(this.prisma.raw.school, id);
    return {
      success: true,
      statusCode: 200,
      message: 'School deleted successfully',
      data: null,
      meta: null,
    };
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

  private handleSchoolCreateError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta.target.join(', ')
          : 'unique field';
        throw new ConflictException(`A school already exists with this ${target}.`);
      }

      if (error.code === 'P2003') {
        throw new BadRequestException(
          'Invalid related data. Please check division, district, upazila, or referenced IDs.',
        );
      }

      if (error.code === 'P2000') {
        throw new BadRequestException('One or more fields are too long.');
      }
    }

    throw error;
  }
}
