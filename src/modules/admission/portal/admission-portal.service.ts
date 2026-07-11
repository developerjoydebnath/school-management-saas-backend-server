import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import { AdmissionApplicationsService } from '../applications/admission-applications.service';
import { CreateAdmissionApplicationDto } from '../applications/dto/admission-application.dto';
import { AdmissionSettingsService } from '../settings/admission-settings.service';

const PORTAL_SUBMIT_WINDOW_MS = 60_000;
const portalSubmitAttempts = new Map<string, number>();
const MANUAL_APPLICATION_SOURCES = ['admin_fast', 'admin_full'];

@Injectable()
export class AdmissionPortalService {
  constructor(
    private tenantConnection: TenantConnectionService,
    private applicationsService: AdmissionApplicationsService,
    private settingsService: AdmissionSettingsService,
  ) {}

  private prisma() {
    return this.tenantConnection.getTenantClient();
  }

  private response(message: string, data: any, statusCode = 200) {
    return { success: true, statusCode, message, data, meta: null };
  }

  private fieldOptions(field: any) {
    if (field.options && typeof field.options === 'object' && !Array.isArray(field.options)) {
      return field.options;
    }
    if (Array.isArray(field.options)) {
      return { options: field.options };
    }
    return {};
  }

  private portalMeta(field: any) {
    const options = this.fieldOptions(field);
    return {
      isShown:
        typeof options.portal?.isShown === 'boolean'
          ? options.portal.isShown
          : field.showInFastMode ?? field.isShown ?? true,
      isRequired:
        typeof options.portal?.isRequired === 'boolean'
          ? options.portal.isRequired
          : field.requiredInFastMode ?? field.isRequired ?? false,
    };
  }

  private fieldForClient(field: any) {
    const options = this.fieldOptions(field);
    const portal = this.portalMeta(field);
    return {
      ...field,
      options,
      portal,
      isShown: portal.isShown,
      isRequired: portal.isRequired,
    };
  }

  private async currentSessionId() {
    const session = await this.prisma().academicSession.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { year: 'desc' },
      select: { id: true },
    });
    if (!session) throw new NotFoundException('Active session not found');
    return session.id;
  }

  private assertRateLimit(slug: string, req: any) {
    const forwardedFor = String(req?.headers?.['x-forwarded-for'] || '')
      .split(',')[0]
      .trim();
    const ip = forwardedFor || req?.ip || req?.socket?.remoteAddress || 'unknown';
    const key = `${slug}:${ip}`;
    const now = Date.now();
    const lastAttempt = portalSubmitAttempts.get(key) || 0;
    if (now - lastAttempt < PORTAL_SUBMIT_WINDOW_MS) {
      throw new BadRequestException(
        'Please wait before submitting another admission application.',
      );
    }
    portalSubmitAttempts.set(key, now);
  }

  private async getOpenSettings(slug: string) {
    const settings = await this.prisma().admissionSettings.findFirst({
      where: {
        onlinePortalSlug: slug,
        onlinePortalEnabled: true,
        deletedAt: null,
      },
      include: {
        fieldConfigs: {
          where: { deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!settings) {
      throw new NotFoundException('Admission portal not found');
    }

    const now = new Date();
    if (settings.onlinePortalOpensAt && settings.onlinePortalOpensAt > now) {
      throw new BadRequestException('Admission portal is not open yet');
    }
    if (settings.onlinePortalClosesAt && settings.onlinePortalClosesAt < now) {
      throw new BadRequestException('Admission portal is closed');
    }

    return settings;
  }

  async adminConfig(sessionId?: string, userId?: string) {
    const targetSessionId = sessionId || (await this.currentSessionId());
    const settingsResponse = await this.settingsService.getBySession(
      targetSessionId,
      userId,
    );
    const settings = settingsResponse.data;
    const [onlineCount, manualCount, pendingOnlineCount, approvedOnlineCount] =
      await Promise.all([
        this.prisma().admissionApplication.count({
          where: {
            sessionId: settings.sessionId,
            source: 'online_portal',
            deletedAt: null,
          },
        }),
        this.prisma().admissionApplication.count({
          where: {
            sessionId: settings.sessionId,
            source: { in: MANUAL_APPLICATION_SOURCES },
            deletedAt: null,
          },
        }),
        this.prisma().admissionApplication.count({
          where: {
            sessionId: settings.sessionId,
            source: 'online_portal',
            status: 'pending',
            deletedAt: null,
          },
        }),
        this.prisma().admissionApplication.count({
          where: {
            sessionId: settings.sessionId,
            source: 'online_portal',
            status: 'approved',
            deletedAt: null,
          },
        }),
      ]);

    const slug =
      settings.onlinePortalSlug ||
      `admission-${String(settings.sessionId).slice(0, 8)}`;

    return this.response('Admission portal configuration retrieved successfully', {
      ...settings,
      onlinePortalSlug: slug,
      fieldConfigs: (settings.fieldConfigs || []).map((field: any) =>
        this.fieldForClient(field),
      ),
      stats: {
        onlineApplications: onlineCount,
        manualApplications: manualCount,
        pendingOnlineApplications: pendingOnlineCount,
        approvedOnlineApplications: approvedOnlineCount,
      },
    });
  }

  async updateAdminConfig(dto: any, userId?: string) {
    const sessionId = dto.sessionId || (await this.currentSessionId());
    const settingsResponse = await this.settingsService.update(
      sessionId,
      {
        onlinePortalEnabled: dto.onlinePortalEnabled,
        onlinePortalSlug: dto.onlinePortalSlug,
        onlinePortalOpensAt: dto.onlinePortalOpensAt,
        onlinePortalClosesAt: dto.onlinePortalClosesAt,
      },
      userId,
    );
    const settings = settingsResponse.data;

    if (Array.isArray(dto.fields)) {
      const existingFields = await this.prisma().admissionFieldConfig.findMany({
        where: { settingsId: settings.id, deletedAt: null },
      });
      const existingByKey = new Map(
        existingFields.map((field: any) => [field.fieldKey, field]),
      );

      for (const field of dto.fields) {
        const existing = existingByKey.get(field.fieldKey);
        if (!existing) continue;
        const options = this.fieldOptions(existing);
        await this.prisma().admissionFieldConfig.update({
          where: { id: existing.id },
          data: {
            options: {
              ...options,
              portal: {
                isShown: Boolean(field.portal?.isShown),
                isRequired: Boolean(field.portal?.isRequired),
              },
            },
            updatedBy: userId || null,
          },
        });
      }
    }

    return this.adminConfig(sessionId, userId);
  }

  async config(slug: string) {
    const settings = await this.getOpenSettings(slug);
    const [classes, shifts, divisions, districts, upazilas] = await Promise.all([
      this.prisma().class.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
        select: {
          id: true,
          enName: true,
          bnName: true,
          sections: {
            where: { deletedAt: null, status: 'ACTIVE' },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          },
        },
      orderBy: [{ enName: 'asc' }],
      }),
      this.prisma().shift.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: { id: true, name: true },
        orderBy: [{ name: 'asc' }],
      }),
      this.prisma().division.findMany({
        select: { id: true, enName: true, bnName: true },
        orderBy: [{ enName: 'asc' }],
      }),
      this.prisma().district.findMany({
        select: { id: true, divisionId: true, enName: true, bnName: true },
        orderBy: [{ enName: 'asc' }],
      }),
      this.prisma().upazila.findMany({
        select: { id: true, districtId: true, enName: true, bnName: true },
        orderBy: [{ enName: 'asc' }],
      }),
    ]);
    const fields = settings.fieldConfigs
      .map((field: any) => this.fieldForClient(field))
      .filter((field: any) => field.portal.isShown);

    return this.response('Admission portal config retrieved successfully', {
      id: settings.id,
      sessionId: settings.sessionId,
      admissionMode: 'portal',
      defaultAdmissionFee: settings.defaultAdmissionFee,
      draftEnabled: settings.draftEnabled,
      discountEnabled: settings.discountEnabled,
      discountType: settings.discountType,
      discountScope: settings.discountScope,
      discountValue: settings.discountValue,
      discountMaxAmount: settings.discountMaxAmount,
      manualDiscountEnabled: settings.manualDiscountEnabled,
      referenceEnabled: settings.referenceEnabled,
      classes: classes.map((item) => ({
        label: item.enName,
        value: item.id,
        bnLabel: item.bnName,
        sections: item.sections.map((section) => ({
          label: section.name,
          value: section.id,
        })),
      })),
      shifts: shifts.map((item) => ({
        label: item.name,
        value: item.id,
      })),
      divisions: divisions.map((item) => ({
        label: item.enName,
        value: String(item.id),
        id: item.id,
        bnLabel: item.bnName,
      })),
      districts: districts.map((item) => ({
        label: item.enName || item.bnName,
        value: String(item.id),
        id: item.id,
        divisionId: item.divisionId,
        bnLabel: item.bnName,
      })),
      upazilas: upazilas.map((item) => ({
        label: item.enName || item.bnName,
        value: String(item.id),
        id: item.id,
        districtId: item.districtId,
        bnLabel: item.bnName,
      })),
      fields,
    });
  }

  async fee(slug: string, classId?: string) {
    const settings = await this.getOpenSettings(slug);
    return this.settingsService.calculateFee(settings.sessionId, classId, undefined);
  }

  async createApplication(slug: string, dto: CreateAdmissionApplicationDto, req: any) {
    this.assertRateLimit(slug, req);
    const settings = await this.getOpenSettings(slug);
    const requiredFields = settings.fieldConfigs
      .map((field: any) => this.fieldForClient(field))
      .filter((field: any) => field.portal.isShown && field.portal.isRequired);
    const missingFields = requiredFields.filter((field: any) => {
      const value = (dto as any)[field.fieldKey];
      return value === undefined || value === null || value === '';
    });
    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required field: ${missingFields[0].label}`,
      );
    }
    return this.applicationsService.create(
      {
        ...dto,
        sessionId: dto.sessionId || dto.session || settings.sessionId,
        admissionMode: 'fast',
        source: 'online_portal',
      },
      undefined,
    );
  }
}
