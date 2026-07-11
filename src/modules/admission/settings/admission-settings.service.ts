import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TenantConnectionService } from 'src/cores/prisma.service';
import { ADMISSION_FEE_HEADS } from '../shared/admission-fee-seed';
import { ADMISSION_SYSTEM_FIELDS } from '../shared/admission-field-seed';
import {
  AdmissionFieldConfigDto,
  AdmissionFeeHeadDto,
  UpsertAdmissionSettingsDto,
} from './dto/admission-settings.dto';

@Injectable()
export class AdmissionSettingsService {
  constructor(private tenantConnection: TenantConnectionService) {}

  private prisma() {
    return this.tenantConnection.getTenantClient();
  }

  private response(message: string, data: any, statusCode = 200) {
    return { success: true, statusCode, message, data, meta: null };
  }

  private normalizeSettings(dto: UpsertAdmissionSettingsDto, userId?: string) {
    const discountEnabled =
      dto.discountEnabled === true && dto.manualDiscountEnabled === true
        ? false
        : dto.discountEnabled;
    const manualDiscountEnabled =
      dto.discountEnabled === true && dto.manualDiscountEnabled === true
        ? true
        : dto.manualDiscountEnabled;

    return {
      admissionMode: dto.admissionMode,
      onlinePortalEnabled: dto.onlinePortalEnabled,
      onlinePortalSlug: dto.onlinePortalSlug || null,
      onlinePortalOpensAt: dto.onlinePortalOpensAt
        ? new Date(dto.onlinePortalOpensAt)
        : null,
      onlinePortalClosesAt: dto.onlinePortalClosesAt
        ? new Date(dto.onlinePortalClosesAt)
        : null,
      draftEnabled: dto.draftEnabled,
      discountEnabled,
      discountType: dto.discountType,
      discountScope: dto.discountScope,
      discountValue:
        dto.discountValue === undefined ? undefined : dto.discountValue,
      discountMaxAmount:
        dto.discountMaxAmount === undefined ? undefined : dto.discountMaxAmount,
      manualDiscountEnabled,
      quotaDiscountEnabled: dto.quotaDiscountEnabled,
      quotaDiscountRules: dto.quotaDiscountRules ?? undefined,
      referenceEnabled: dto.referenceEnabled,
      defaultAdmissionFee:
        dto.defaultAdmissionFee === undefined ? undefined : dto.defaultAdmissionFee,
      applicationPrefix: dto.applicationPrefix,
      updatedBy: userId || null,
    };
  }

  private fieldData(field: AdmissionFieldConfigDto, userId?: string) {
    return {
      fieldKey: field.fieldKey,
      section: field.section,
      label: field.label,
      labelBn: field.labelBn || null,
      fieldType: field.fieldType,
      options: field.options ?? undefined,
      placeholder: field.placeholder || null,
      helpText: field.helpText || null,
      isShown: field.isShown ?? true,
      isRequired: field.isRequired ?? false,
      showInFastMode: field.showInFastMode ?? field.isShown ?? true,
      showInFullMode: field.showInFullMode ?? field.isShown ?? true,
      requiredInFastMode: field.requiredInFastMode ?? field.isRequired ?? false,
      requiredInFullMode: field.requiredInFullMode ?? field.isRequired ?? false,
      isSystem: field.isSystem ?? false,
      isSystemLocked: field.isSystemLocked ?? false,
      isCustom: field.isCustom ?? false,
      dependsOnFieldKey: field.dependsOnFieldKey || null,
      sortOrder: field.sortOrder ?? 0,
      minLength: field.minLength ?? null,
      maxLength: field.maxLength ?? null,
      minValue: field.minValue ?? null,
      maxValue: field.maxValue ?? null,
      regexPattern: field.regexPattern || null,
      updatedBy: userId || null,
    };
  }

  private slug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private normalizeFieldIdentity(value: string) {
    return this.slug(value || '');
  }

  private canonicalFieldKey(field: any) {
    if (field.section !== 'documents') {
      return `${field.section}:${field.fieldKey}`;
    }

    const documentAliases: Record<string, string> = {
      birth_registration: 'birthRegistrationDocument',
      birth_registration_document: 'birthRegistrationDocument',
      birth_certificate: 'birthRegistrationDocument',
      birth_certificate_document: 'birthRegistrationDocument',
      documents: 'documents',
      document: 'documents',
      previous_school_testimonial: 'previousSchoolTestimonial',
      testimonial: 'previousSchoolTestimonial',
      transfer_certificate: 'transferCertificateDocument',
      transfer_certificate_document: 'transferCertificateDocument',
      tc_scan: 'transferCertificateDocument',
      father_nid: 'fatherNidDocument',
      father_nid_document: 'fatherNidDocument',
      mother_nid: 'motherNidDocument',
      mother_nid_document: 'motherNidDocument',
      guardian_nid: 'guardianNidDocument',
      guardian_nid_document: 'guardianNidDocument',
      medical_document: 'medicalDocument',
      payment_slip: 'paymentSlipDocument',
      payment_slip_document: 'paymentSlipDocument',
      other_document: 'otherDocument',
    };

    const labelKey = this.normalizeFieldIdentity(field.label);
    const fieldKey = this.normalizeFieldIdentity(field.fieldKey);
    return `documents:${documentAliases[fieldKey] || documentAliases[labelKey] || field.fieldKey}`;
  }

  private async reconcileDuplicateFields(settingsId: string, userId?: string) {
    const prisma = this.prisma();
    const fields = await prisma.admissionFieldConfig.findMany({
      where: { settingsId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const grouped = new Map<string, typeof fields>();

    for (const field of fields) {
      const key = this.canonicalFieldKey(field);
      grouped.set(key, [...(grouped.get(key) || []), field]);
    }

    let changed = false;
    for (const [identity, group] of grouped.entries()) {
      if (group.length < 2) continue;

      const canonicalKey = identity.split(':')[1];
      const canonicalSeed = ADMISSION_SYSTEM_FIELDS.find(
        (field) => field.section === group[0].section && field.fieldKey === canonicalKey,
      );
      const mostRecentlyEdited = [...group].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
      )[0];
      const canonicalField = group.find((field) => field.fieldKey === canonicalKey);
      const keeper = canonicalField || mostRecentlyEdited;

      await prisma.admissionFieldConfig.update({
        where: { id: keeper.id },
        data: {
          fieldKey: canonicalKey,
          label: canonicalSeed?.label || keeper.label,
          labelBn: canonicalSeed?.labelBn || keeper.labelBn,
          fieldType: canonicalSeed?.fieldType || keeper.fieldType,
          placeholder: canonicalSeed?.placeholder || keeper.placeholder,
          options: (canonicalSeed?.options as any) ?? keeper.options ?? undefined,
          isSystem: canonicalSeed?.isSystem ?? keeper.isSystem,
          isSystemLocked: canonicalSeed?.isSystemLocked ?? keeper.isSystemLocked,
          isShown: mostRecentlyEdited.isShown,
          isRequired: mostRecentlyEdited.isRequired,
          showInFastMode: mostRecentlyEdited.showInFastMode,
          showInFullMode: mostRecentlyEdited.showInFullMode,
          requiredInFastMode: mostRecentlyEdited.requiredInFastMode,
          requiredInFullMode: mostRecentlyEdited.requiredInFullMode,
          sortOrder: canonicalSeed?.sortOrder ?? keeper.sortOrder,
          updatedBy: userId || null,
        },
      });

      const duplicateIds = group
        .filter((field) => field.id !== keeper.id)
        .map((field) => field.id);
      if (duplicateIds.length > 0) {
        await prisma.admissionFieldConfig.updateMany({
          where: { id: { in: duplicateIds } },
          data: { deletedAt: new Date(), deletedBy: userId || null },
        });
      }
      changed = true;
    }

    return changed;
  }

  private feeHeadData(fee: AdmissionFeeHeadDto, userId?: string) {
    return {
      name: fee.name,
      nameBn: fee.nameBn || null,
      code: fee.code || this.slug(fee.name),
      type: fee.type || 'one_time',
      amount: fee.amount ?? 0,
      isShown: fee.isShown ?? true,
      isRequired: fee.isRequired ?? false,
      isSystem: fee.isSystem ?? false,
      sortOrder: fee.sortOrder ?? 0,
      description: fee.description || null,
      updatedBy: userId || null,
    };
  }

  private async ensureFeeHeads(settingsId: string, userId?: string) {
    const prisma = this.prisma();
    const existing = await prisma.admissionFeeHead.findMany({
      where: { settingsId, deletedAt: null },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map((fee) => fee.code));
    const missing = ADMISSION_FEE_HEADS.filter(
      (fee) => !existingCodes.has(fee.code),
    );

    if (missing.length > 0) {
      await prisma.admissionFeeHead.createMany({
        data: missing.map((fee) => ({
          ...fee,
          settingsId,
          amount: fee.amount,
          createdBy: userId || null,
          updatedBy: userId || null,
        })),
        skipDuplicates: true,
      });
    }
  }

  async ensureSettings(sessionId: string, userId?: string) {
    const prisma = this.prisma();
    let settings = await prisma.admissionSettings.findFirst({
      where: { sessionId, deletedAt: null },
      include: { fieldConfigs: { where: { deletedAt: null } } },
    });

    if (!settings) {
      settings = await prisma.admissionSettings.create({
        data: {
          sessionId,
          createdBy: userId || null,
          updatedBy: userId || null,
          fieldConfigs: {
            create: ADMISSION_SYSTEM_FIELDS.map((field) => ({
              ...field,
              options: field.options as any,
              createdBy: userId || null,
              updatedBy: userId || null,
            })),
          },
          feeHeads: {
            create: ADMISSION_FEE_HEADS.map((fee) => ({
              ...fee,
              createdBy: userId || null,
              updatedBy: userId || null,
            })),
          },
        },
        include: {
          fieldConfigs: {
            where: { deletedAt: null },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });
    } else {
      const existingSettings = settings;
      const existingKeys = new Set(
        existingSettings.fieldConfigs.map((field) => field.fieldKey),
      );
      const missingFields = ADMISSION_SYSTEM_FIELDS.filter(
        (field) => !existingKeys.has(field.fieldKey),
      );

      if (missingFields.length > 0) {
        await prisma.admissionFieldConfig.createMany({
          data: missingFields.map((field) => ({
            ...field,
            options: field.options as any,
            settingsId: existingSettings.id,
            createdBy: userId || null,
            updatedBy: userId || null,
          })),
          skipDuplicates: true,
        });

        settings = await prisma.admissionSettings.findFirstOrThrow({
          where: { id: existingSettings.id },
          include: {
            fieldConfigs: {
              where: { deletedAt: null },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
          },
        });
      }
    }

    await this.ensureFeeHeads(settings.id, userId);
    const reconciledFields = await this.reconcileDuplicateFields(settings.id, userId);
    if (reconciledFields) {
      settings = await prisma.admissionSettings.findFirstOrThrow({
        where: { id: settings.id },
        include: {
          fieldConfigs: {
            where: { deletedAt: null },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });
    }

    return settings;
  }

  async getCurrent(sessionId?: string, userId?: string) {
    const prisma = this.prisma();
    let targetSessionId = sessionId;
    if (!targetSessionId) {
      const activeSession = await prisma.academicSession.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { year: 'desc' },
        select: { id: true },
      });
      if (!activeSession) {
        throw new NotFoundException('Active session not found');
      }
      targetSessionId = activeSession.id;
    }

    const settings = await this.ensureSettings(targetSessionId, userId);
    return this.response('Admission settings retrieved successfully', settings);
  }

  async getBySession(sessionId: string, userId?: string) {
    const settings = await this.ensureSettings(sessionId, userId);
    return this.response('Admission settings retrieved successfully', settings);
  }

  async update(sessionId: string, dto: UpsertAdmissionSettingsDto, userId?: string) {
    await this.ensureSettings(sessionId, userId);
    const updated = await this.prisma().admissionSettings.update({
      where: { sessionId },
      data: this.normalizeSettings(dto, userId),
      include: {
        fieldConfigs: {
          where: { deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    return this.response('Admission settings updated successfully', updated);
  }

  async getFields(sessionId: string, userId?: string) {
    const settings = await this.ensureSettings(sessionId, userId);
    const fields = await this.prisma().admissionFieldConfig.findMany({
      where: { settingsId: settings.id, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return this.response('Admission fields retrieved successfully', fields);
  }

  async updateFields(sessionId: string, fields: AdmissionFieldConfigDto[], userId?: string) {
    const settings = await this.ensureSettings(sessionId, userId);
    const prisma = this.prisma();

    const existing = await prisma.admissionFieldConfig.findMany({
      where: { settingsId: settings.id, deletedAt: null },
    });
    const existingByKey = new Map(existing.map((field) => [field.fieldKey, field]));

    for (const field of fields) {
      const existingField = existingByKey.get(field.fieldKey);
      if (existingField?.isSystemLocked) {
        field.isShown = true;
        field.isRequired = true;
        field.showInFastMode = true;
        field.showInFullMode = true;
        field.requiredInFastMode = true;
        field.requiredInFullMode = true;
      }
      if (existingField) {
        await prisma.admissionFieldConfig.update({
          where: { id: existingField.id },
          data: this.fieldData({ ...field, isSystem: existingField.isSystem, isSystemLocked: existingField.isSystemLocked }, userId),
        });
      } else {
        await prisma.admissionFieldConfig.create({
          data: {
            ...this.fieldData(field, userId),
            settingsId: settings.id,
            createdBy: userId || null,
          },
        });
      }
    }

    return this.getFields(sessionId, userId);
  }

  async createCustomField(sessionId: string, field: AdmissionFieldConfigDto, userId?: string) {
    const settings = await this.ensureSettings(sessionId, userId);
    if (!field.fieldKey.startsWith('custom_')) {
      field.fieldKey = `custom_${field.fieldKey}`;
    }
    const created = await this.prisma().admissionFieldConfig.create({
      data: {
        ...this.fieldData({ ...field, isCustom: true, isSystem: false, isSystemLocked: false }, userId),
        settingsId: settings.id,
        createdBy: userId || null,
      },
    });
    return this.response('Custom admission field created successfully', created, 201);
  }

  async removeField(fieldId: string, userId?: string) {
    const prisma = this.prisma();
    const field = await prisma.admissionFieldConfig.findFirst({
      where: { id: fieldId, deletedAt: null },
    });
    if (!field) throw new NotFoundException('Admission field not found');
    if (field.isSystem) {
      throw new BadRequestException('System admission fields cannot be deleted');
    }
    await prisma.admissionFieldConfig.update({
      where: { id: fieldId },
      data: { deletedAt: new Date(), deletedBy: userId || null },
    });
    return this.response('Admission field deleted successfully', null);
  }

  async getFeeHeads(sessionId: string, userId?: string) {
    const settings = await this.ensureSettings(sessionId, userId);
    await this.ensureFeeHeads(settings.id, userId);
    const feeHeads = await this.prisma().admissionFeeHead.findMany({
      where: { settingsId: settings.id, deletedAt: null },
      include: {
        classAmounts: {
          where: { deletedAt: null },
          include: { class: { select: { id: true, enName: true, bnName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return this.response('Admission fee heads retrieved successfully', feeHeads);
  }

  async createFeeHead(sessionId: string, dto: AdmissionFeeHeadDto, userId?: string) {
    const settings = await this.ensureSettings(sessionId, userId);
    const feeHead = await this.prisma().admissionFeeHead.create({
      data: {
        ...this.feeHeadData({ ...dto, isSystem: false }, userId),
        settingsId: settings.id,
        createdBy: userId || null,
        classAmounts: dto.classAmounts?.length
          ? {
              create: dto.classAmounts.map((amount) => ({
                classId: amount.classId,
                amount: amount.amount,
                createdBy: userId || null,
                updatedBy: userId || null,
              })),
            }
          : undefined,
      },
      include: { classAmounts: true },
    });
    return this.response('Admission fee head created successfully', feeHead, 201);
  }

  async updateFeeHead(feeHeadId: string, dto: AdmissionFeeHeadDto, userId?: string) {
    const prisma = this.prisma();
    const feeHead = await prisma.admissionFeeHead.findFirst({
      where: { id: feeHeadId, deletedAt: null },
      include: { classAmounts: { where: { deletedAt: null } } },
    });
    if (!feeHead) throw new NotFoundException('Admission fee head not found');

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.admissionFeeHead.update({
        where: { id: feeHeadId },
        data: this.feeHeadData(
          { ...dto, isSystem: feeHead.isSystem, code: dto.code || feeHead.code },
          userId,
        ),
      });

      if (dto.classAmounts) {
        const incomingClassIds = new Set(dto.classAmounts.map((item) => item.classId));
        for (const existing of feeHead.classAmounts) {
          if (!incomingClassIds.has(existing.classId)) {
            await tx.admissionFeeHeadClassAmount.update({
              where: { id: existing.id },
              data: { deletedAt: new Date(), deletedBy: userId || null },
            });
          }
        }
        for (const classAmount of dto.classAmounts) {
          await tx.admissionFeeHeadClassAmount.upsert({
            where: {
              feeHeadId_classId: {
                feeHeadId,
                classId: classAmount.classId,
              },
            },
            update: {
              amount: classAmount.amount,
              deletedAt: null,
              deletedBy: null,
              updatedBy: userId || null,
            },
            create: {
              feeHeadId,
              classId: classAmount.classId,
              amount: classAmount.amount,
              createdBy: userId || null,
              updatedBy: userId || null,
            },
          });
        }
      }

      return row;
    });

    return this.response('Admission fee head updated successfully', updated);
  }

  async removeFeeHead(feeHeadId: string, userId?: string) {
    const feeHead = await this.prisma().admissionFeeHead.findFirst({
      where: { id: feeHeadId, deletedAt: null },
    });
    if (!feeHead) throw new NotFoundException('Admission fee head not found');
    if (feeHead.isSystem) {
      throw new BadRequestException('System admission fee heads cannot be deleted');
    }
    await this.prisma().admissionFeeHead.update({
      where: { id: feeHeadId },
      data: { deletedAt: new Date(), deletedBy: userId || null },
    });
    return this.response('Admission fee head deleted successfully', null);
  }

  async copyFeeHeadsFromPreviousSession(sessionId: string, userId?: string) {
    const prisma = this.prisma();
    const targetSession = await prisma.academicSession.findUnique({
      where: { id: sessionId },
      select: { id: true, year: true },
    });
    if (!targetSession) throw new NotFoundException('Session not found');

    const previousSession = await prisma.academicSession.findFirst({
      where: { year: { lt: targetSession.year } },
      orderBy: { year: 'desc' },
      select: { id: true },
    });
    if (!previousSession) {
      throw new NotFoundException('Previous session not found');
    }

    const targetSettings = await this.ensureSettings(sessionId, userId);
    const previousSettings = await this.ensureSettings(previousSession.id, userId);
    const previousFeeHeads = await prisma.admissionFeeHead.findMany({
      where: { settingsId: previousSettings.id, deletedAt: null },
      include: { classAmounts: { where: { deletedAt: null } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    await prisma.$transaction(async (tx) => {
      const targetFeeHeads = await tx.admissionFeeHead.findMany({
        where: { settingsId: targetSettings.id, deletedAt: null },
        include: { classAmounts: { where: { deletedAt: null } } },
      });
      const targetByCode = new Map(targetFeeHeads.map((fee) => [fee.code, fee]));
      const previousCodes = new Set(previousFeeHeads.map((fee) => fee.code));

      for (const targetFee of targetFeeHeads) {
        if (!previousCodes.has(targetFee.code) && !targetFee.isSystem) {
          await tx.admissionFeeHead.update({
            where: { id: targetFee.id },
            data: { deletedAt: new Date(), deletedBy: userId || null },
          });
        }
      }

      for (const previousFee of previousFeeHeads) {
        const existingTarget = targetByCode.get(previousFee.code);
        const feePayload = {
          name: previousFee.name,
          nameBn: previousFee.nameBn,
          code: previousFee.code,
          type: previousFee.type,
          amount: previousFee.amount,
          isShown: previousFee.isShown,
          isRequired: previousFee.isRequired,
          isSystem: previousFee.isSystem,
          sortOrder: previousFee.sortOrder,
          description: previousFee.description,
          updatedBy: userId || null,
          deletedAt: null,
          deletedBy: null,
        };

        const targetFee = existingTarget
          ? await tx.admissionFeeHead.update({
              where: { id: existingTarget.id },
              data: feePayload,
            })
          : await tx.admissionFeeHead.create({
              data: {
                ...feePayload,
                settingsId: targetSettings.id,
                createdBy: userId || null,
              },
            });

        const existingClassAmounts = await tx.admissionFeeHeadClassAmount.findMany({
          where: { feeHeadId: targetFee.id, deletedAt: null },
        });
        const incomingClassIds = new Set(
          previousFee.classAmounts.map((item) => item.classId),
        );

        for (const existingAmount of existingClassAmounts) {
          if (!incomingClassIds.has(existingAmount.classId)) {
            await tx.admissionFeeHeadClassAmount.update({
              where: { id: existingAmount.id },
              data: { deletedAt: new Date(), deletedBy: userId || null },
            });
          }
        }

        for (const previousAmount of previousFee.classAmounts) {
          await tx.admissionFeeHeadClassAmount.upsert({
            where: {
              feeHeadId_classId: {
                feeHeadId: targetFee.id,
                classId: previousAmount.classId,
              },
            },
            update: {
              amount: previousAmount.amount,
              deletedAt: null,
              deletedBy: null,
              updatedBy: userId || null,
            },
            create: {
              feeHeadId: targetFee.id,
              classId: previousAmount.classId,
              amount: previousAmount.amount,
              createdBy: userId || null,
              updatedBy: userId || null,
            },
          });
        }
      }
    });

    return this.getFeeHeads(sessionId, userId);
  }

  calculateDiscount(settings: any, feeTotals: any, manualDiscount?: any, quotaType?: string) {
    const baseByScope: Record<string, number> = {
      admission_fee:
        feeTotals.items.find((item: any) => item.code === 'admission_fee')?.amount ??
        feeTotals.requiredTotal,
      required_total: feeTotals.requiredTotal,
      shown_total: feeTotals.shownTotal,
    };

    const normalizeMaxAmount = (value: any) => {
      if (value === null || value === undefined || value === '') return null;
      const numericValue = Number(value);
      return numericValue > 0 ? numericValue : null;
    };

    const normalizeQuotaKey = (value: any) => {
      if (value && typeof value === 'object') {
        value = value.value || value.quotaType || value.key || value.label;
      }
      return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
    };
    const selectedQuotaKey = normalizeQuotaKey(quotaType);

    const configuredRule =
      settings.discountEnabled && Number(settings.discountValue || 0) > 0
        ? {
            type: settings.discountType || 'fixed_amount',
            scope: settings.discountScope || 'required_total',
            value: Number(settings.discountValue || 0),
            maxAmount: normalizeMaxAmount(settings.discountMaxAmount),
            source: 'configured',
            reason: null,
          }
        : null;

    const manualRule =
      settings.manualDiscountEnabled &&
      manualDiscount &&
      Number(manualDiscount.value || 0) > 0
        ? {
            type: manualDiscount.type || 'fixed_amount',
            scope: manualDiscount.scope || 'required_total',
            value: Number(manualDiscount.value || 0),
            maxAmount: normalizeMaxAmount(manualDiscount.maxAmount),
            source: 'manual',
            reason: manualDiscount.reason || null,
          }
        : null;

    const quotaRules = Array.isArray(settings.quotaDiscountRules)
      ? settings.quotaDiscountRules
      : [];
    const quotaRule =
      settings.quotaDiscountEnabled &&
      selectedQuotaKey &&
      selectedQuotaKey !== 'none'
        ? quotaRules.find(
            (item: any) =>
              item?.enabled !== false &&
              normalizeQuotaKey(item?.quotaType) === selectedQuotaKey &&
              Number(item?.value || 0) > 0,
          )
        : null;
    const normalizedQuotaRule = quotaRule
      ? {
          type: quotaRule.type || 'fixed_amount',
          scope: quotaRule.scope || 'required_total',
          value: Number(quotaRule.value || 0),
          maxAmount: normalizeMaxAmount(quotaRule.maxAmount),
          source: 'quota',
          reason: quotaRule.reason || `${quotaRule.label || selectedQuotaKey} quota discount`,
        }
      : null;

    const rules = [manualRule || configuredRule, normalizedQuotaRule].filter(Boolean);
    if (rules.length === 0) {
      return {
        subtotal: feeTotals.requiredTotal,
        discountAmount: 0,
        payableAmount: feeTotals.requiredTotal,
        discountType: null,
        discountScope: null,
        discountValue: null,
        discountSource: null,
        discountReason: null,
      };
    }

    const appliedRules = rules.map((rule: any) => {
      const discountBase = Math.max(Number(baseByScope[rule.scope] || 0), 0);
      let amount =
        rule.type === 'percentage'
          ? (discountBase * rule.value) / 100
          : rule.value;
      if (rule.maxAmount !== null) {
        amount = Math.min(amount, rule.maxAmount);
      }
      amount = Math.max(Number(amount || 0), 0);
      return {
        ...rule,
        amount: Number(amount.toFixed(2)),
      };
    });
    const rawDiscountAmount = appliedRules.reduce(
      (sum: number, rule: any) => sum + rule.amount,
      0,
    );
    const discountAmount = Number(
      Math.min(rawDiscountAmount, feeTotals.requiredTotal).toFixed(2),
    );

    return {
      subtotal: feeTotals.requiredTotal,
      discountAmount,
      payableAmount: Number((feeTotals.requiredTotal - discountAmount).toFixed(2)),
      discountType: appliedRules.map((rule: any) => rule.type).join('+'),
      discountScope: appliedRules.map((rule: any) => rule.scope).join('+'),
      discountValue: appliedRules.reduce((sum: number, rule: any) => sum + rule.value, 0),
      discountSource: appliedRules.map((rule: any) => rule.source).join('+'),
      discountReason: appliedRules
        .map((rule: any) => rule.reason)
        .filter(Boolean)
        .join(' + ') || null,
      discountBreakdown: appliedRules,
    };
  }

  async calculateFee(
    sessionId?: string,
    classId?: string,
    userId?: string,
    manualDiscount?: any,
    quotaType?: string,
  ) {
    const settingsResponse = sessionId
      ? await this.getBySession(sessionId, userId)
      : await this.getCurrent(undefined, userId);
    const settings = settingsResponse.data;
    const feeHeads = await this.prisma().admissionFeeHead.findMany({
      where: { settingsId: settings.id, isShown: true, deletedAt: null },
      include: {
        classAmounts: {
          where: {
            deletedAt: null,
            ...(classId ? { classId } : {}),
          },
          take: 1,
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const items = feeHeads.map((fee) => {
      const amount = Number(fee.classAmounts[0]?.amount ?? fee.amount ?? 0);
      return {
        id: fee.id,
        name: fee.name,
        nameBn: fee.nameBn,
        code: fee.code,
        type: fee.type,
        amount,
        isRequired: fee.isRequired,
      };
    });
    const requiredTotal = items
      .filter((item) => item.isRequired)
      .reduce((sum, item) => sum + item.amount, 0);
    const shownTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discount = this.calculateDiscount(
      settings,
      { items, requiredTotal, shownTotal },
      manualDiscount,
      quotaType,
    );

    return this.response('Admission fee calculated successfully', {
      sessionId: settings.sessionId,
      classId: classId || null,
      items,
      requiredTotal,
      shownTotal,
      ...discount,
      settings: {
        draftEnabled: settings.draftEnabled,
        discountEnabled: settings.discountEnabled,
        discountType: settings.discountType,
        discountScope: settings.discountScope,
        discountValue: Number(settings.discountValue || 0),
        discountMaxAmount:
          settings.discountMaxAmount === null ? null : Number(settings.discountMaxAmount),
        manualDiscountEnabled: settings.manualDiscountEnabled,
        quotaDiscountEnabled: settings.quotaDiscountEnabled,
        quotaDiscountRules: settings.quotaDiscountRules,
        referenceEnabled: settings.referenceEnabled,
      },
    });
  }
}
