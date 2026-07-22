import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantConnectionService } from 'src/cores/prisma.service';
import { AdmissionApplicationsService } from '../applications/admission-applications.service';
import { CreateAdmissionApplicationDto } from '../applications/dto/admission-application.dto';
import { AdmissionSettingsService } from '../settings/admission-settings.service';
import { PaymentMethodSettingsService } from '../../settings/payment-methods/payment-method-settings.service';
import { StudentPaymentsService } from '../../student-payments/student-payments.service';

const PORTAL_SUBMIT_WINDOW_MS = 60_000;
const portalSubmitAttempts = new Map<string, number>();
const MANUAL_APPLICATION_SOURCES = ['admin_fast', 'admin_full'];
const SSLCOMMERZ_INIT_ENDPOINTS = {
  sandbox: 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
  live: 'https://securepay.sslcommerz.com/gwprocess/v4/api.php',
} as const;
const SSLCOMMERZ_VALIDATION_ENDPOINTS = {
  sandbox: 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php',
  live: 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php',
} as const;

@Injectable()
export class AdmissionPortalService {
  constructor(
    private tenantConnection: TenantConnectionService,
    private applicationsService: AdmissionApplicationsService,
    private settingsService: AdmissionSettingsService,
    private paymentMethodSettingsService: PaymentMethodSettingsService,
    private studentPaymentsService: StudentPaymentsService,
  ) {}

  private prisma() {
    return this.tenantConnection.getTenantClient();
  }

  private tenantSchema() {
    const schema = this.tenantConnection.getTenantSchema();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
      throw new BadRequestException('Invalid tenant schema');
    }
    return schema;
  }

  private table(tableName: string) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new BadRequestException('Invalid table name');
    }
    return Prisma.raw(`"${this.tenantSchema()}"."${tableName}"`);
  }

  private async ensurePaymentTransactionsTable(client: any = this.prisma()) {
    const schema = this.tenantSchema();
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schema}"."payment_transactions" (
        id UUID PRIMARY KEY DEFAULT uuidv7(),
        transaction_no VARCHAR(50) NOT NULL UNIQUE,
        gateway VARCHAR(50) NOT NULL,
        gateway_transaction_id VARCHAR(120),
        gateway_validation_id VARCHAR(120),
        gateway_bank_transaction_id VARCHAR(120),
        merchant_tran_id VARCHAR(100) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'initiated',
        amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
        payable_type VARCHAR(40) NOT NULL DEFAULT 'admission',
        payable_id UUID NOT NULL,
        admission_application_id UUID,
        student_payment_id UUID,
        student_id UUID,
        user_id UUID,
        payment_method_id UUID,
        payment_method_name VARCHAR(120),
        payment_method_provider VARCHAR(50),
        request_payload JSONB,
        response_payload JSONB,
        validation_payload JSONB,
        failure_reason TEXT,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at TIMESTAMPTZ
      )
    `);
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS payment_transactions_gateway_idx ON "${schema}"."payment_transactions"(gateway)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS payment_transactions_merchant_tran_id_idx ON "${schema}"."payment_transactions"(merchant_tran_id)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS payment_transactions_status_idx ON "${schema}"."payment_transactions"(status)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS payment_transactions_payable_idx ON "${schema}"."payment_transactions"(payable_type, payable_id)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS payment_transactions_admission_application_id_idx ON "${schema}"."payment_transactions"(admission_application_id)`,
    );
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
    const isLocked = Boolean(field.isSystemLocked);
    if (isLocked) {
      return {
        isShown: true,
        isRequired: true,
      };
    }

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

  private async getPortalSettings(slug: string, enforceWindow = true) {
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

    if (enforceWindow) {
      const now = new Date();
      if (settings.onlinePortalOpensAt && settings.onlinePortalOpensAt > now) {
        throw new BadRequestException('Admission portal is not open yet');
      }
      if (settings.onlinePortalClosesAt && settings.onlinePortalClosesAt < now) {
        throw new BadRequestException('Admission portal is closed');
      }
    }

    return settings;
  }

  private money(value: any) {
    const number = Number(value || 0);
    if (!Number.isFinite(number)) return 0;
    return Number(number.toFixed(2));
  }

  private toDate(value: any) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private frontendBaseUrl() {
    return (
      process.env.ADMISSION_PAYMENT_BASE_URL ||
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000'
    ).replace(/\/+$/, '');
  }

  private sslMode(mode?: string) {
    return mode === 'live' ? 'live' : 'sandbox';
  }

  private appendParams(url: string, params: Record<string, string>) {
    const target = new URL(url);
    for (const [key, value] of Object.entries(params)) {
      target.searchParams.set(key, value);
    }
    return target.toString();
  }

  private async nextTransactionNo(tx: any, gateway = 'sslcommerz') {
    const year = new Date().getFullYear();
    const rows = (await tx.$queryRaw(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM ${this.table('payment_transactions')}
      WHERE transaction_no LIKE ${`TXN-${year}-%`}
    `)) as Array<{ count: bigint }>;
    const count = Number(rows[0]?.count || 0);
    const shortGateway = gateway.slice(0, 3).toUpperCase();
    return `TXN-${year}-${shortGateway}-${String(count + 1).padStart(6, '0')}`;
  }

  private async createPaymentTransaction(tx: any, data: any) {
    await this.ensurePaymentTransactionsTable(tx);
    const transactionNo = await this.nextTransactionNo(tx, data.gateway);
    const rows = (await tx.$queryRaw(Prisma.sql`
      INSERT INTO ${this.table('payment_transactions')} (
        transaction_no,
        gateway,
        merchant_tran_id,
        status,
        amount,
        currency,
        payable_type,
        payable_id,
        admission_application_id,
        payment_method_id,
        payment_method_name,
        payment_method_provider,
        request_payload,
        response_payload
      )
      VALUES (
        ${transactionNo},
        ${data.gateway},
        ${data.merchantTranId},
        ${data.status || 'initiated'},
        ${data.amount},
        ${data.currency || 'BDT'},
        ${data.payableType || 'admission'},
        ${data.payableId}::uuid,
        ${data.admissionApplicationId || null}::uuid,
        ${data.paymentMethodId || null}::uuid,
        ${data.paymentMethodName || null},
        ${data.paymentMethodProvider || null},
        ${JSON.stringify(data.requestPayload || {})}::jsonb,
        ${JSON.stringify(data.responsePayload || {})}::jsonb
      )
      RETURNING *
    `)) as any[];
    return rows[0];
  }

  private async updatePaymentTransaction(tx: any, merchantTranId: string, data: any) {
    await this.ensurePaymentTransactionsTable(tx);
    const rows = (await tx.$queryRaw(Prisma.sql`
      UPDATE ${this.table('payment_transactions')}
      SET
        status = COALESCE(${data.status || null}, status),
        gateway_transaction_id = COALESCE(${data.gatewayTransactionId || null}, gateway_transaction_id),
        gateway_validation_id = COALESCE(${data.gatewayValidationId || null}, gateway_validation_id),
        gateway_bank_transaction_id = COALESCE(${data.gatewayBankTransactionId || null}, gateway_bank_transaction_id),
        student_payment_id = COALESCE(CAST(${data.studentPaymentId || null} AS uuid), student_payment_id),
        response_payload = COALESCE(${data.responsePayload ? JSON.stringify(data.responsePayload) : null}::jsonb, response_payload),
        validation_payload = COALESCE(${data.validationPayload ? JSON.stringify(data.validationPayload) : null}::jsonb, validation_payload),
        failure_reason = COALESCE(${data.failureReason || null}, failure_reason),
        paid_at = COALESCE(${data.paidAt || null}, paid_at),
        updated_at = now()
      WHERE merchant_tran_id = ${merchantTranId}
        AND deleted_at IS NULL
      RETURNING *
    `)) as any[];
    return rows[0];
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
      tenantSchema: this.tenantConnection.getTenantSchema(),
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
        const isLocked = Boolean(existing.isSystemLocked);
        const isShown = isLocked ? true : Boolean(field.portal?.isShown);
        const isRequired = isLocked
          ? true
          : Boolean(field.portal?.isRequired) && isShown;
        await this.prisma().admissionFieldConfig.update({
          where: { id: existing.id },
          data: {
            options: {
              ...options,
              portal: {
                isShown,
                isRequired,
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
    const [
      classes,
      shifts,
      divisions,
      districts,
      upazilas,
      paymentMethodResponse,
    ] = await Promise.all([
      this.prisma().class.findMany({
        where: { deletedAt: null, status: 'ACTIVE' },
        select: {
          id: true,
          enName: true,
          bnName: true,
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
      this.paymentMethodSettingsService.activeOptions('public'),
    ]);
    const paymentMethods = Array.isArray(paymentMethodResponse?.data)
      ? paymentMethodResponse.data
      : [];
    const classIds = classes.map((item) => item.id);
    const sectionSetups = classIds.length
      ? await this.prisma().sessionClassSection.findMany({
          where: {
            sessionId: settings.sessionId,
            classId: { in: classIds },
            sectionId: { not: null },
            deletedAt: null,
            status: 'ACTIVE',
          },
          select: {
            classId: true,
            section: { select: { id: true, name: true } },
          },
          orderBy: [{ section: { sortOrder: 'asc' } }, { section: { name: 'asc' } }],
        })
      : [];
    const sectionsByClass = new Map<string, Array<{ label: string; value: string }>>();
    for (const setup of sectionSetups) {
      if (!setup.section) continue;
      const current = sectionsByClass.get(setup.classId) || [];
      current.push({ label: setup.section.name, value: setup.section.id });
      sectionsByClass.set(setup.classId, current);
    }
    const fields = settings.fieldConfigs
      .map((field: any) => this.fieldForClient(field))
      .filter((field: any) => field.portal.isShown && field.section !== 'payment');

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
      discountStackingMode: settings.discountStackingMode || 'stack_all',
      manualDiscountEnabled: settings.manualDiscountEnabled,
      referenceEnabled: settings.referenceEnabled,
      classes: classes.map((item) => ({
        label: item.enName,
        value: item.id,
        bnLabel: item.bnName,
        sections: sectionsByClass.get(item.id) || [],
      })),
      shifts: shifts.map((item) => ({
        label: item.name,
        value: item.id,
      })),
      paymentMethods,
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
      .filter(
        (field: any) =>
          field.portal.isShown &&
          field.portal.isRequired &&
          field.section !== 'payment',
      );
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

  async paymentDetails(slug: string, applicationId: string) {
    const settings = await this.getPortalSettings(slug, false);
    const application = await this.prisma().admissionApplication.findFirst({
      where: {
        id: applicationId,
        sessionId: settings.sessionId,
        source: 'online_portal',
        deletedAt: null,
      },
      include: {
        applyingClass: { select: { id: true, enName: true, bnName: true } },
        section: { select: { id: true, name: true, bnName: true } },
      },
    });

    if (!application) {
      throw new NotFoundException('Admission application not found');
    }

    const status = String(application.status || '').toLowerCase();
    if (status !== 'eligible_for_payment') {
      throw new BadRequestException(
        'This admission application is not eligible for payment yet.',
      );
    }

    const feeResponse = await this.settingsService.calculateFee(
      settings.sessionId,
      application.applyingClassId,
      undefined,
      undefined,
      typeof application.specialQuota === 'string' ? application.specialQuota : undefined,
    );
    const paymentMethodsResponse = await this.paymentMethodSettingsService.activeOptions('public');
    const paymentMethods = Array.isArray(paymentMethodsResponse?.data)
      ? paymentMethodsResponse.data
      : [];
    const fee = feeResponse.data;
    const alreadyPaid = this.money(application.admissionFeeAmount);
    const payableAmount = this.money(fee.payableAmount ?? fee.requiredTotal);
    const dueAmount = Math.max(payableAmount - alreadyPaid, 0);

    return this.response('Admission payment details retrieved successfully', {
      application: {
        id: application.id,
        applicationNo: application.applicationNo,
        studentNameEn: application.studentNameEn,
        email: application.email,
        fatherMobile: application.fatherMobile,
        className: application.applyingClass?.enName,
        sectionName: application.section?.name,
        paymentStatus: application.paymentStatus,
      },
      fee: {
        ...fee,
        alreadyPaid,
        dueAmount,
      },
      paymentMethods,
    });
  }

  async submitPayment(slug: string, applicationId: string, dto: any) {
    const detailsResponse = await this.paymentDetails(slug, applicationId);
    const details = detailsResponse.data;
    const methodValue = dto.paymentMethod || dto.provider || dto.method;
    const method = (details.paymentMethods || []).find(
      (item: any) =>
        item.value === methodValue ||
        item.provider === methodValue ||
        item.id === methodValue,
    );
    if (!method) {
      throw new BadRequestException('Select an active payment method');
    }

    const amount = this.money(dto.amount || dto.paidAmount || details.fee.dueAmount);
    const dueBeforePayment = this.money(details.fee.dueAmount);
    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }
    if (amount > dueBeforePayment) {
      throw new BadRequestException('Payment amount cannot be greater than payable due');
    }

    if (method.provider === 'sslcommerz' || method.value === 'sslcommerz') {
      return this.initiateSslCommerzPayment(slug, applicationId, details, method, amount);
    }

    const paidAt = this.toDate(dto.paidAt) || new Date();
    const paymentMethod = method.value || method.provider || method.id;
    const updated = await this.prisma().$transaction(async (tx) => {
      const current = await tx.admissionApplication.findFirst({
        where: {
          id: applicationId,
          source: 'online_portal',
          deletedAt: null,
        },
      });
      if (!current) throw new NotFoundException('Admission application not found');

      const previousPaid = this.money(current.admissionFeeAmount);
      const payableAmount = this.money(details.fee.payableAmount ?? details.fee.requiredTotal);
      const nextPaid = Number((previousPaid + amount).toFixed(2));
      const nextDue = Number(Math.max(payableAmount - nextPaid, 0).toFixed(2));
      const paymentStatus = nextDue > 0 ? 'partial' : 'paid';

      const application = await tx.admissionApplication.update({
        where: { id: applicationId },
        data: {
          admissionFeeSubtotal: details.fee.subtotal ?? details.fee.requiredTotal,
          admissionDiscountAmount: details.fee.discountAmount ?? 0,
          admissionPayableAmount: payableAmount,
          admissionFeeAmount: nextPaid,
          paymentStatus,
          paymentMethod,
          transactionId: dto.transactionId || null,
          paidAt,
          customData: {
            ...(current.customData && typeof current.customData === 'object'
              ? current.customData
              : {}),
            admissionDueAmount: nextDue,
            admissionPaidAmount: nextPaid,
            latestPaymentNote: dto.note || null,
          },
        },
      });

      await this.studentPaymentsService.recordAdmissionPayment(
        tx,
        {
          ...application,
          paymentGateway: 'manual',
          gatewayProvider: method.provider || method.value || paymentMethod,
        },
        undefined,
        amount,
      );
      return application;
    });

    return this.response('Admission payment submitted successfully', {
      id: updated.id,
      applicationNo: updated.applicationNo,
      paymentStatus: updated.paymentStatus,
      paidAmount: updated.admissionFeeAmount,
      payableAmount: updated.admissionPayableAmount,
    });
  }

  private async initiateSslCommerzPayment(
    slug: string,
    applicationId: string,
    details: any,
    selectedMethod: any,
    amount: number,
  ) {
    const method = await this.paymentMethodSettingsService.findActiveByProvider(
      'sslcommerz',
      'public',
    );
    const credentials = method.credentialData || {};
    const storeId = String(credentials.storeId || credentials.store_id || '').trim();
    const storePassword = String(
      credentials.storePassword || credentials.storePasswd || credentials.store_passwd || '',
    ).trim();
    if (!storeId || !storePassword) {
      throw new BadRequestException('SSLCommerz store credentials are not configured');
    }

    const mode = this.sslMode(method.mode);
    const tenant = this.tenantSchema();
    const merchantTranId = `ADM-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;
    const callbackUrls = this.paymentMethodSettingsService.resolveSslCommerzCallbackUrls(
      credentials,
    );
    const callbackParams = {
      tenant,
      slug,
      applicationId,
    };
    const requestPayload = {
      store_id: storeId,
      store_passwd: storePassword,
      total_amount: amount.toFixed(2),
      currency: method.currency || 'BDT',
      tran_id: merchantTranId,
      success_url: this.appendParams(callbackUrls.successUrl, callbackParams),
      fail_url: this.appendParams(callbackUrls.failUrl, callbackParams),
      cancel_url: this.appendParams(callbackUrls.cancelUrl, callbackParams),
      ipn_url: this.appendParams(callbackUrls.ipnUrl, callbackParams),
      product_name: `Admission fee ${details.application.applicationNo || applicationId}`,
      product_category: 'admission',
      product_profile: 'non-physical-goods',
      shipping_method: 'NO',
      cus_name: details.application.studentNameEn || details.application.studentName || 'Applicant',
      cus_email: details.application.email || 'admission@example.com',
      cus_add1: 'Bangladesh',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: details.application.fatherMobile || '01700000000',
      value_a: applicationId,
      value_b: slug,
      value_c: tenant,
    };

    const transaction = await this.prisma().$transaction(async (tx) =>
      this.createPaymentTransaction(tx, {
        gateway: 'sslcommerz',
        merchantTranId,
        amount,
        currency: method.currency || 'BDT',
        payableId: applicationId,
        admissionApplicationId: applicationId,
        paymentMethodId: method.id || selectedMethod.id,
        paymentMethodName: method.displayName || selectedMethod.label,
        paymentMethodProvider: 'sslcommerz',
        requestPayload: {
          ...requestPayload,
          store_passwd: '********',
        },
      }),
    );

    const response = await fetch(SSLCOMMERZ_INIT_ENDPOINTS[mode], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(requestPayload as Record<string, string>),
    });
    const gatewayResponse = await response.json().catch(() => null);
    const redirectUrl = gatewayResponse?.GatewayPageURL;

    await this.prisma().$transaction(async (tx) =>
      this.updatePaymentTransaction(tx, merchantTranId, {
        status: redirectUrl ? 'redirect_created' : 'init_failed',
        responsePayload: gatewayResponse || { statusCode: response.status },
        failureReason: redirectUrl
          ? null
          : gatewayResponse?.failedreason || 'SSLCommerz initiation failed',
      }),
    );

    if (!response.ok || !redirectUrl) {
      throw new BadRequestException(
        gatewayResponse?.failedreason || 'SSLCommerz payment gateway did not return a redirect URL',
      );
    }

    return this.response('SSLCommerz payment session created successfully', {
      transactionId: transaction.id,
      transactionNo: transaction.transaction_no,
      merchantTranId,
      redirectUrl,
    });
  }

  private async validateSslCommerzPayment(mode: 'sandbox' | 'live', payload: any, storeId: string, storePassword: string) {
    const valId = String(payload.val_id || '').trim();
    if (!valId) return null;
    const url = new URL(SSLCOMMERZ_VALIDATION_ENDPOINTS[mode]);
    url.searchParams.set('val_id', valId);
    url.searchParams.set('store_id', storeId);
    url.searchParams.set('store_passwd', storePassword);
    url.searchParams.set('v', '1');
    url.searchParams.set('format', 'json');
    const response = await fetch(url.toString());
    return response.json().catch(() => null);
  }

  async handleSslCommerzCallback(kind: 'success' | 'fail' | 'cancel' | 'ipn', payload: any) {
    const merchantTranId = String(payload.tran_id || '').trim();
    if (!merchantTranId) {
      throw new BadRequestException('SSLCommerz transaction id is missing');
    }

    await this.ensurePaymentTransactionsTable();
    const existingRows = (await this.prisma().$queryRaw(Prisma.sql`
      SELECT *
      FROM ${this.table('payment_transactions')}
      WHERE merchant_tran_id = ${merchantTranId}
        AND deleted_at IS NULL
      LIMIT 1
    `)) as any[];
    const transaction = existingRows[0];
    if (!transaction) throw new NotFoundException('Payment transaction not found');
    const transactionRequest =
      transaction.request_payload && typeof transaction.request_payload === 'object'
        ? transaction.request_payload
        : {};
    const resultSlug = String(payload.slug || payload.value_b || transactionRequest.value_b || '');
    const resultTenant = String(
      payload.tenant || payload.schema || payload.value_c || transactionRequest.value_c || this.tenantSchema(),
    );

    const method = await this.paymentMethodSettingsService.findActiveByProvider(
      'sslcommerz',
      'public',
    );
    const credentials = method.credentialData || {};
    const storeId = String(credentials.storeId || credentials.store_id || '').trim();
    const storePassword = String(
      credentials.storePassword || credentials.storePasswd || credentials.store_passwd || '',
    ).trim();
    const mode = this.sslMode(method.mode);
    const validation =
      kind === 'success'
        ? await this.validateSslCommerzPayment(mode, payload, storeId, storePassword)
        : null;
    const validationStatus = String(validation?.status || payload.status || '').toUpperCase();
    const isSuccess =
      kind === 'success' &&
      ['VALID', 'VALIDATED', 'SUCCESS'].includes(validationStatus);
    const paidAt = isSuccess ? new Date() : null;
    const finalStatus = isSuccess
      ? 'success'
      : kind === 'cancel'
        ? 'cancelled'
        : kind === 'ipn'
          ? 'ipn_received'
          : 'failed';

    let studentPaymentId: string | null = null;
    if (isSuccess) {
      const application = await this.prisma().$transaction(async (tx) => {
        const current = await tx.admissionApplication.findFirst({
          where: {
            id: transaction.admission_application_id,
            source: 'online_portal',
            deletedAt: null,
          },
        });
        if (!current) throw new NotFoundException('Admission application not found');

        const amount = this.money(transaction.amount);
        const previousPaid = this.money(current.admissionFeeAmount);
        const payableAmount = this.money(current.admissionPayableAmount);
        const nextPaid = Number((previousPaid + amount).toFixed(2));
        const nextDue = Number(Math.max(payableAmount - nextPaid, 0).toFixed(2));
        const paymentStatus = nextDue > 0 ? 'partial' : 'paid';
        const customData =
          current.customData && typeof current.customData === 'object'
            ? current.customData
            : {};

        const updated = await tx.admissionApplication.update({
          where: { id: current.id },
          data: {
            paymentStatus,
            paymentMethod: 'sslcommerz',
            transactionId:
              payload.bank_tran_id ||
              payload.card_issuer_trans_id ||
              payload.tran_id ||
              merchantTranId,
            paidAt,
            admissionFeeAmount: nextPaid,
            customData: {
              ...customData,
              admissionDueAmount: nextDue,
              admissionPaidAmount: nextPaid,
              sslCommerzTranId: payload.tran_id || merchantTranId,
              sslCommerzValidationId: payload.val_id || null,
            },
          },
        });

        const studentPayment = await this.studentPaymentsService.recordAdmissionPayment(
          tx,
          {
            ...updated,
            paymentGateway: 'sslcommerz',
            gatewayProvider: 'sslcommerz',
            paymentId: merchantTranId,
          },
          undefined,
          amount,
        );
        studentPaymentId = studentPayment?.id || null;
        return updated;
      });

      await this.prisma().$transaction(async (tx) =>
        this.updatePaymentTransaction(tx, merchantTranId, {
          status: finalStatus,
          gatewayTransactionId: payload.tran_id || merchantTranId,
          gatewayValidationId: payload.val_id || null,
          gatewayBankTransactionId: payload.bank_tran_id || null,
          studentPaymentId,
          responsePayload: payload,
          validationPayload: validation,
          paidAt,
        }),
      );

      return {
        status: finalStatus,
        applicationId: application.id,
        applicationNo: application.applicationNo,
        paymentStatus: application.paymentStatus,
        studentPaymentId,
        slug: resultSlug,
        tenant: resultTenant,
      };
    }

    await this.prisma().$transaction(async (tx) =>
      this.updatePaymentTransaction(tx, merchantTranId, {
        status: finalStatus,
        gatewayTransactionId: payload.tran_id || merchantTranId,
        gatewayValidationId: payload.val_id || null,
        gatewayBankTransactionId: payload.bank_tran_id || null,
        responsePayload: payload,
        validationPayload: validation,
        failureReason:
          payload.error ||
          payload.failedreason ||
          validation?.failedreason ||
          `SSLCommerz ${kind} callback received`,
      }),
    );

    return {
      status: finalStatus,
      applicationId: transaction.admission_application_id,
      applicationNo: null,
      paymentStatus: null,
      studentPaymentId: null,
      slug: resultSlug,
      tenant: resultTenant,
    };
  }

  paymentResultUrl(result: any) {
    const base = `${this.frontendBaseUrl()}/admission-payment`;
    return this.appendParams(base, {
      status: result.status || 'unknown',
      applicationId: result.applicationId || '',
      slug: result.slug || '',
      tenant: result.tenant || '',
    });
  }
}
