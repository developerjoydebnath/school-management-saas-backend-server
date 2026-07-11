import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import { AdmissionApplicationsService } from '../applications/admission-applications.service';
import { CreateAdmissionApplicationDto } from '../applications/dto/admission-application.dto';
import { AdmissionSettingsService } from '../settings/admission-settings.service';

const PORTAL_SUBMIT_WINDOW_MS = 60_000;
const portalSubmitAttempts = new Map<string, number>();

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

  async config(slug: string) {
    const settings = await this.getOpenSettings(slug);
    const classes = await this.prisma().class.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true, enName: true, bnName: true },
      orderBy: [{ enName: 'asc' }],
    });
    const fields = settings.fieldConfigs.filter((field: any) =>
      settings.admissionMode === 'fast'
        ? (field.showInFastMode ?? field.isShown)
        : (field.showInFullMode ?? field.isShown),
    );

    return this.response('Admission portal config retrieved successfully', {
      id: settings.id,
      sessionId: settings.sessionId,
      admissionMode: settings.admissionMode,
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
    return this.applicationsService.create(
      {
        ...dto,
        sessionId: dto.sessionId || dto.session || settings.sessionId,
        admissionMode: dto.admissionMode || settings.admissionMode,
        source: 'online_portal',
      },
      undefined,
    );
  }
}
