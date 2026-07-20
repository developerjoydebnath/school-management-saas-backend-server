import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TenantConnectionService } from 'src/cores/prisma.service';
import {
  CreatePaymentMethodSettingDto,
  UpdatePaymentMethodSettingDto,
} from './dto/payment-method-setting.dto';
import {
  getPaymentMethodTemplate,
  PAYMENT_METHOD_TEMPLATES,
} from './payment-method-templates';

function normalizeJson(value: any) {
  if (!value || typeof value !== 'object') return {};
  return value;
}

function titleCase(value?: string | null) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const SSLCOMMERZ_CALLBACK_PATHS = {
  successUrl: '/payments/sslcommerz/success',
  failUrl: '/payments/sslcommerz/fail',
  cancelUrl: '/payments/sslcommerz/cancel',
  ipnUrl: '/payments/sslcommerz/ipn',
} as const;

type SslCommerzCallbackKey = keyof typeof SSLCOMMERZ_CALLBACK_PATHS;

@Injectable()
export class PaymentMethodSettingsService {
  constructor(private readonly tenantConnection: TenantConnectionService) {}

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

  private response(message: string, data: any, statusCode = 200) {
    return { success: true, statusCode, message, data, meta: null };
  }

  private stripTrailingSlash(value: string) {
    return value.replace(/\/+$/, '');
  }

  private apiBaseUrl() {
    return this.stripTrailingSlash(
      process.env.PAYMENT_API_BASE_URL ||
        process.env.API_BASE_URL ||
        process.env.BACKEND_BASE_URL ||
        `http://localhost:${process.env.PORT || 5000}`,
    );
  }

  private apiCallbackUrl(path: string) {
    const baseUrl = this.apiBaseUrl();
    const hasApiPrefix = /\/api\/v\d+$/i.test(baseUrl);
    return `${baseUrl}${hasApiPrefix ? '' : '/api/v1'}${path}`;
  }

  private validateCallbackUrl(key: string, value: string) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException(`${titleCase(key)} must be a valid URL`);
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException(`${titleCase(key)} must use HTTP or HTTPS`);
    }

    const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    if (
      process.env.NODE_ENV === 'production' &&
      url.protocol !== 'https:' &&
      !isLocalhost
    ) {
      throw new BadRequestException(`${titleCase(key)} must be an HTTPS URL in production`);
    }
  }

  private sanitizeCredentialData(provider: string, credentialData: Record<string, any>) {
    const data = { ...normalizeJson(credentialData) };

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        data[key] = value.trim();
      }
    }

    if (provider !== 'sslcommerz') return data;

    for (const key of Object.keys(SSLCOMMERZ_CALLBACK_PATHS) as SslCommerzCallbackKey[]) {
      const value = typeof data[key] === 'string' ? data[key].trim() : '';
      if (!value) {
        delete data[key];
        continue;
      }
      this.validateCallbackUrl(key, value);
      data[key] = value;
    }

    return data;
  }

  resolveSslCommerzCallbackUrls(credentialData: Record<string, any> = {}) {
    const data = normalizeJson(credentialData);
    return Object.fromEntries(
      (Object.keys(SSLCOMMERZ_CALLBACK_PATHS) as SslCommerzCallbackKey[]).map((key) => [
        key,
        typeof data[key] === 'string' && data[key].trim()
          ? data[key].trim()
          : this.apiCallbackUrl(SSLCOMMERZ_CALLBACK_PATHS[key]),
      ]),
    ) as Record<SslCommerzCallbackKey, string>;
  }

  private async ensureTable(client: any = this.prisma()) {
    const schema = this.tenantSchema();
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schema}"."payment_method_settings" (
        id UUID PRIMARY KEY DEFAULT uuidv7(),
        provider VARCHAR(50) NOT NULL,
        display_name VARCHAR(120) NOT NULL,
        description TEXT,
        mode VARCHAR(20) NOT NULL DEFAULT 'sandbox',
        status VARCHAR(20) NOT NULL DEFAULT 'INACTIVE',
        is_default BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
        instructions TEXT,
        credential_data JSONB DEFAULT '{}'::jsonb,
        public_config JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by UUID,
        updated_by UUID,
        deleted_at TIMESTAMPTZ,
        deleted_by UUID
      )
    `);
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS payment_method_settings_provider_idx ON "${schema}"."payment_method_settings"(provider)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS payment_method_settings_status_idx ON "${schema}"."payment_method_settings"(status)`,
    );
    await client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS payment_method_settings_deleted_at_idx ON "${schema}"."payment_method_settings"(deleted_at)`,
    );
  }

  private normalize(item: any) {
    if (!item) return item;
    return {
      id: item.id,
      provider: item.provider,
      providerLabel:
        getPaymentMethodTemplate(item.provider)?.label || titleCase(item.provider),
      displayName: item.displayName,
      description: item.description,
      mode: item.mode,
      status: item.status,
      isDefault: !!item.isDefault,
      sortOrder: Number(item.sortOrder || 0),
      currency: item.currency,
      instructions: item.instructions,
      credentialData: item.credentialData || {},
      publicConfig: item.publicConfig || {},
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private rowSelect() {
    return Prisma.sql`
      id,
      provider,
      display_name AS "displayName",
      description,
      mode,
      status,
      is_default AS "isDefault",
      sort_order AS "sortOrder",
      currency,
      instructions,
      credential_data AS "credentialData",
      public_config AS "publicConfig",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `;
  }

  private async seedDefaults() {
    const client = this.prisma();
    const countRows = await client.$queryRaw<any[]>`
      SELECT COUNT(*)::int AS count
      FROM ${this.table('payment_method_settings')}
      WHERE deleted_at IS NULL
    `;
    if (Number(countRows?.[0]?.count || 0) > 0) return;

    for (const [index, template] of PAYMENT_METHOD_TEMPLATES.entries()) {
      const status = template.provider === 'cash' ? 'ACTIVE' : 'INACTIVE';
      const isDefault = template.provider === 'cash';
      await client.$executeRaw`
        INSERT INTO ${this.table('payment_method_settings')} (
          provider,
          display_name,
          description,
          mode,
          status,
          is_default,
          sort_order,
          currency,
          credential_data,
          public_config
        )
        VALUES (
          ${template.provider},
          ${template.label},
          ${template.description},
          ${template.defaultMode},
          ${status},
          ${isDefault},
          ${index},
          ${'BDT'},
          ${JSON.stringify({})}::jsonb,
          ${JSON.stringify({})}::jsonb
        )
      `;
    }
  }

  async providers() {
    return this.response('Payment method providers retrieved successfully', PAYMENT_METHOD_TEMPLATES);
  }

  async findAll(query: any = {}) {
    await this.ensureTable();
    await this.seedDefaults();

    const clauses: Prisma.Sql[] = [Prisma.sql`deleted_at IS NULL`];
    if (query.status) {
      clauses.push(Prisma.sql`status = ${String(query.status).toUpperCase()}`);
    }
    if (query.provider) {
      clauses.push(Prisma.sql`provider = ${query.provider}`);
    }
    if (query.search) {
      const search = `%${query.search}%`;
      clauses.push(Prisma.sql`(display_name ILIKE ${search} OR provider ILIKE ${search})`);
    }

    const where = Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}`;
    const page = Math.max(Number(query.page || 1), 1);
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
    const skip = (page - 1) * limit;

    const [items, totalRows] = await Promise.all([
      this.prisma().$queryRaw<any[]>`
        SELECT ${this.rowSelect()}
        FROM ${this.table('payment_method_settings')}
        ${where}
        ORDER BY is_default DESC, sort_order ASC, created_at DESC
        LIMIT ${limit} OFFSET ${skip}
      `,
      this.prisma().$queryRaw<any[]>`
        SELECT COUNT(*)::int AS count
        FROM ${this.table('payment_method_settings')}
        ${where}
      `,
    ]);

    const total = Number(totalRows?.[0]?.count || 0);
    return this.response('Payment methods retrieved successfully', {
      items: items.map((item) => this.normalize(item)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    });
  }

  async activeOptions() {
    await this.ensureTable();
    await this.seedDefaults();

    const items = await this.prisma().$queryRaw<any[]>`
      SELECT ${this.rowSelect()}
      FROM ${this.table('payment_method_settings')}
      WHERE deleted_at IS NULL AND status = 'ACTIVE'
      ORDER BY is_default DESC, sort_order ASC, display_name ASC
    `;

    return this.response(
      'Active payment method options retrieved successfully',
      items.map((item) => ({
        label: item.displayName,
        value: item.provider,
        id: item.id,
        provider: item.provider,
        mode: item.mode,
        currency: item.currency,
        instructions: item.instructions,
      })),
    );
  }

  async findActiveByProvider(provider: string) {
    await this.ensureTable();
    await this.seedDefaults();

    const items = await this.prisma().$queryRaw<any[]>`
      SELECT ${this.rowSelect()}
      FROM ${this.table('payment_method_settings')}
      WHERE provider = ${provider}
        AND status = 'ACTIVE'
        AND deleted_at IS NULL
      ORDER BY is_default DESC, sort_order ASC, created_at DESC
      LIMIT 1
    `;

    const item = items[0];
    if (!item) throw new BadRequestException('Selected payment method is not active');
    return this.normalize(item);
  }

  async findOne(id: string) {
    await this.ensureTable();
    const items = await this.prisma().$queryRaw<any[]>`
      SELECT ${this.rowSelect()}
      FROM ${this.table('payment_method_settings')}
      WHERE id = ${id}::uuid AND deleted_at IS NULL
      LIMIT 1
    `;
    const item = items[0];
    if (!item) throw new NotFoundException('Payment method not found');
    return this.response('Payment method retrieved successfully', this.normalize(item));
  }

  private validateProvider(provider: string) {
    if (!getPaymentMethodTemplate(provider)) {
      throw new BadRequestException('Unsupported payment provider');
    }
  }

  private async clearDefaultIfNeeded(isDefault?: boolean) {
    if (!isDefault) return;
    await this.prisma().$executeRaw`
      UPDATE ${this.table('payment_method_settings')}
      SET is_default = false, updated_at = now()
      WHERE deleted_at IS NULL
    `;
  }

  async create(dto: CreatePaymentMethodSettingDto, userId?: string) {
    await this.ensureTable();
    this.validateProvider(dto.provider);
    await this.clearDefaultIfNeeded(dto.isDefault);

    const template = getPaymentMethodTemplate(dto.provider);
    const credentialData = this.sanitizeCredentialData(dto.provider, dto.credentialData || {});
    const publicConfig = normalizeJson(dto.publicConfig);
    const status = dto.status || 'INACTIVE';
    const mode = dto.mode || template?.defaultMode || 'manual';

    const items = await this.prisma().$queryRaw<any[]>`
      INSERT INTO ${this.table('payment_method_settings')} (
        provider,
        display_name,
        description,
        mode,
        status,
        is_default,
        sort_order,
        currency,
        instructions,
        credential_data,
        public_config,
        created_by,
        updated_by
      )
      VALUES (
        ${dto.provider},
        ${dto.displayName},
        ${dto.description || null},
        ${mode},
        ${status},
        ${!!dto.isDefault},
        ${dto.sortOrder || 0},
        ${dto.currency || 'BDT'},
        ${dto.instructions || null},
        ${JSON.stringify(credentialData)}::jsonb,
        ${JSON.stringify(publicConfig)}::jsonb,
        CAST(${userId || null} AS uuid),
        CAST(${userId || null} AS uuid)
      )
      RETURNING ${this.rowSelect()}
    `;

    return this.response(
      'Payment method created successfully',
      this.normalize(items[0]),
      201,
    );
  }

  async update(id: string, dto: UpdatePaymentMethodSettingDto, userId?: string) {
    await this.ensureTable();
    this.validateProvider(dto.provider);
    await this.clearDefaultIfNeeded(dto.isDefault);

    const credentialData = this.sanitizeCredentialData(dto.provider, dto.credentialData || {});
    const publicConfig = normalizeJson(dto.publicConfig);
    const items = await this.prisma().$queryRaw<any[]>`
      UPDATE ${this.table('payment_method_settings')}
      SET
        provider = ${dto.provider},
        display_name = ${dto.displayName},
        description = ${dto.description || null},
        mode = ${dto.mode || 'manual'},
        status = ${dto.status || 'INACTIVE'},
        is_default = ${!!dto.isDefault},
        sort_order = ${dto.sortOrder || 0},
        currency = ${dto.currency || 'BDT'},
        instructions = ${dto.instructions || null},
        credential_data = ${JSON.stringify(credentialData)}::jsonb,
        public_config = ${JSON.stringify(publicConfig)}::jsonb,
        updated_by = CAST(${userId || null} AS uuid),
        updated_at = now()
      WHERE id = ${id}::uuid AND deleted_at IS NULL
      RETURNING ${this.rowSelect()}
    `;

    if (!items[0]) throw new NotFoundException('Payment method not found');
    return this.response('Payment method updated successfully', this.normalize(items[0]));
  }

  async updateStatus(id: string, status: string, userId?: string) {
    await this.ensureTable();
    const items = await this.prisma().$queryRaw<any[]>`
      UPDATE ${this.table('payment_method_settings')}
      SET status = ${status}, updated_by = CAST(${userId || null} AS uuid), updated_at = now()
      WHERE id = ${id}::uuid AND deleted_at IS NULL
      RETURNING ${this.rowSelect()}
    `;
    if (!items[0]) throw new NotFoundException('Payment method not found');
    return this.response('Payment method status updated successfully', this.normalize(items[0]));
  }

  async remove(id: string, userId?: string) {
    await this.ensureTable();
    const items = await this.prisma().$queryRaw<any[]>`
      UPDATE ${this.table('payment_method_settings')}
      SET deleted_at = now(), deleted_by = CAST(${userId || null} AS uuid), updated_at = now()
      WHERE id = ${id}::uuid AND deleted_at IS NULL
      RETURNING id
    `;
    if (!items[0]) throw new NotFoundException('Payment method not found');
    return this.response('Payment method deleted successfully', { id });
  }
}
