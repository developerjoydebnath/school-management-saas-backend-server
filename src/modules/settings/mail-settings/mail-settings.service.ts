import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import {
  decryptCredential,
  encryptCredential,
} from 'src/common/utils/credential-crypto.util';
import {
  PrismaService,
  TenantConnectionService,
} from 'src/cores/prisma.service';
import { TestMailConfigDto, UpdateMailConfigDto } from './dto/mail-settings.dto';

type MailConfigRow = {
  id?: string;
  provider?: string | null;
  mode?: string | null;
  isActive?: boolean | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean | null;
  smtpUser?: string | null;
  smtpPasswordEncrypted?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
  replyToEmail?: string | null;
  isVerified?: boolean | null;
  lastVerifiedAt?: Date | string | null;
  lastTestStatus?: string | null;
  lastTestError?: string | null;
  lastTestedAt?: Date | string | null;
  lastFailedAt?: Date | string | null;
  consecutiveFailures?: number | null;
  updatedAt?: Date | string | null;
};

type ResolvedTransport = {
  source: 'school' | 'platform';
  config: Required<
    Pick<MailConfigRow, 'smtpHost' | 'smtpPort' | 'smtpSecure'>
  > &
    Pick<MailConfigRow, 'smtpUser' | 'fromName' | 'fromEmail' | 'replyToEmail'> & {
      smtpPassword?: string | null;
    };
};

@Injectable()
export class MailSettingsService {
  constructor(
    private readonly tenantConnection: TenantConnectionService,
    private readonly prismaService: PrismaService,
  ) {}

  private tenantSchema() {
    const schema = this.tenantConnection.getTenantSchema();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
      throw new BadRequestException('Invalid tenant schema');
    }
    return schema;
  }

  private tenantTable(tableName: string, schema = this.tenantSchema()) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new BadRequestException('Invalid table name');
    }
    return Prisma.raw(`"${schema}"."${tableName}"`);
  }

  private response(message: string, data: any, statusCode = 200) {
    return { success: true, statusCode, message, data, meta: null };
  }

  private rowSelect(options: { includeMode?: boolean; includeVerification?: boolean } = {}) {
    const { includeMode = false, includeVerification = true } = options;
    return Prisma.sql`
      id,
      provider,
      ${includeMode ? Prisma.sql`mode,` : Prisma.empty}
      is_active AS "isActive",
      smtp_host AS "smtpHost",
      smtp_port AS "smtpPort",
      smtp_secure AS "smtpSecure",
      smtp_user AS "smtpUser",
      smtp_password_encrypted AS "smtpPasswordEncrypted",
      from_name AS "fromName",
      from_email AS "fromEmail",
      reply_to_email AS "replyToEmail",
      ${includeVerification ? Prisma.sql`is_verified AS "isVerified",` : Prisma.empty}
      ${includeVerification ? Prisma.sql`last_verified_at AS "lastVerifiedAt",` : Prisma.empty}
      last_test_status AS "lastTestStatus",
      last_test_error AS "lastTestError",
      last_tested_at AS "lastTestedAt",
      ${includeVerification ? Prisma.sql`last_failed_at AS "lastFailedAt",` : Prisma.empty}
      ${includeVerification ? Prisma.sql`consecutive_failures AS "consecutiveFailures",` : Prisma.empty}
      updated_at AS "updatedAt"
    `;
  }

  private async ensurePlatformTable() {
    await this.prismaService.client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "public"."platform_mail_configs" (
        id UUID PRIMARY KEY DEFAULT uuidv7(),
        provider VARCHAR(30) NOT NULL DEFAULT 'smtp',
        is_active BOOLEAN NOT NULL DEFAULT true,
        smtp_host VARCHAR(255),
        smtp_port INTEGER,
        smtp_secure BOOLEAN NOT NULL DEFAULT false,
        smtp_user VARCHAR(255),
        smtp_password_encrypted TEXT,
        from_name VARCHAR(150),
        from_email VARCHAR(255),
        reply_to_email VARCHAR(255),
        is_verified BOOLEAN NOT NULL DEFAULT false,
        last_verified_at TIMESTAMPTZ,
        last_test_status VARCHAR(20),
        last_test_error TEXT,
        last_tested_at TIMESTAMPTZ,
        last_failed_at TIMESTAMPTZ,
        consecutive_failures INTEGER NOT NULL DEFAULT 0,
        updated_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.prismaService.client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS platform_mail_configs_is_active_idx ON "public"."platform_mail_configs"(is_active)`,
    );
    await this.prismaService.client.$executeRawUnsafe(`
      ALTER TABLE "public"."platform_mail_configs"
        ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS last_failed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0
    `);
    await this.prismaService.client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS platform_mail_configs_is_verified_idx ON "public"."platform_mail_configs"(is_verified)`,
    );
  }

  private async ensureSchoolTable(schema = this.tenantSchema()) {
    await this.prismaService.client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schema}"."school_mail_configs" (
        id UUID PRIMARY KEY DEFAULT uuidv7(),
        provider VARCHAR(30) NOT NULL DEFAULT 'smtp',
        mode VARCHAR(20) NOT NULL DEFAULT 'system',
        is_active BOOLEAN NOT NULL DEFAULT false,
        smtp_host VARCHAR(255),
        smtp_port INTEGER,
        smtp_secure BOOLEAN NOT NULL DEFAULT false,
        smtp_user VARCHAR(255),
        smtp_password_encrypted TEXT,
        from_name VARCHAR(150),
        from_email VARCHAR(255),
        reply_to_email VARCHAR(255),
        is_verified BOOLEAN NOT NULL DEFAULT false,
        last_verified_at TIMESTAMPTZ,
        last_test_status VARCHAR(20),
        last_test_error TEXT,
        last_tested_at TIMESTAMPTZ,
        last_failed_at TIMESTAMPTZ,
        consecutive_failures INTEGER NOT NULL DEFAULT 0,
        updated_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.prismaService.client.$executeRawUnsafe(`
      ALTER TABLE "${schema}"."school_mail_configs"
        ADD COLUMN IF NOT EXISTS mode VARCHAR(20) NOT NULL DEFAULT 'system',
        ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS last_test_status VARCHAR(20),
        ADD COLUMN IF NOT EXISTS last_test_error TEXT,
        ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS last_failed_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0
    `);
    await this.prismaService.client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS school_mail_configs_is_active_idx ON "${schema}"."school_mail_configs"(is_active)`,
    );
    await this.prismaService.client.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS school_mail_configs_is_verified_idx ON "${schema}"."school_mail_configs"(is_verified)`,
    );
  }

  private async ensureTables(schema = this.tenantSchema()) {
    await this.ensurePlatformTable();
    await this.ensureSchoolTable(schema);
  }

  private normalize(row?: MailConfigRow | null, source?: string) {
    return {
      id: row?.id || null,
      provider: row?.provider || 'smtp',
      mode: row?.mode || (source === 'school' ? 'system' : 'own'),
      isActive: !!row?.isActive,
      smtpHost: row?.smtpHost || '',
      smtpPort: row?.smtpPort || 587,
      smtpSecure: !!row?.smtpSecure,
      smtpUser: row?.smtpUser || '',
      hasPassword: !!row?.smtpPasswordEncrypted,
      fromName: row?.fromName || '',
      fromEmail: row?.fromEmail || '',
      replyToEmail: row?.replyToEmail || '',
      isVerified: !!row?.isVerified,
      lastVerifiedAt: row?.lastVerifiedAt || null,
      lastTestStatus: row?.lastTestStatus || null,
      lastTestError: row?.lastTestError || null,
      lastTestedAt: row?.lastTestedAt || null,
      lastFailedAt: row?.lastFailedAt || null,
      consecutiveFailures: Number(row?.consecutiveFailures || 0),
      source: source || null,
      updatedAt: row?.updatedAt || null,
    };
  }

  private sanitize(dto: UpdateMailConfigDto) {
    const clean: UpdateMailConfigDto = { ...dto };
    for (const key of Object.keys(clean) as (keyof UpdateMailConfigDto)[]) {
      const value = clean[key];
      if (typeof value === 'string') {
        (clean as any)[key] = value.trim();
      }
    }
    return clean;
  }

  private createTransport(resolved: ResolvedTransport) {
    const auth =
      resolved.config.smtpUser && resolved.config.smtpPassword
        ? {
            user: resolved.config.smtpUser,
            pass: resolved.config.smtpPassword,
          }
        : undefined;

    return nodemailer.createTransport({
      host: resolved.config.smtpHost,
      port: Number(resolved.config.smtpPort || 587),
      secure: !!resolved.config.smtpSecure,
      auth,
    } as any);
  }

  private fromAddress(config: ResolvedTransport['config']) {
    const email = config.fromEmail || config.smtpUser || 'no-reply@nexa.local';
    const name = config.fromName || 'NEXA School Management';
    return `"${name.replace(/"/g, "'")}" <${email}>`;
  }

  private ensureRequiredForActivation(row: MailConfigRow | null) {
    if (
      !row?.smtpHost ||
      !row?.smtpPort ||
      !row?.fromEmail ||
      (row?.smtpUser && !row?.smtpPasswordEncrypted)
    ) {
      throw new BadRequestException(
        'Configure SMTP host, port, from email, and password when SMTP username is provided before enabling mail',
      );
    }
    if (!row?.isVerified) {
      throw new BadRequestException(
        'Send a successful test email before enabling mail',
      );
    }
  }

  private async schoolRow(schema = this.tenantSchema()) {
    await this.ensureSchoolTable(schema);
    const rows = await this.prismaService.client.$queryRaw<MailConfigRow[]>`
      SELECT ${this.rowSelect({ includeMode: true, includeVerification: true })}
      FROM ${this.tenantTable('school_mail_configs', schema)}
      ORDER BY created_at ASC
      LIMIT 1
    `;
    return rows[0] || null;
  }

  private async platformRow() {
    await this.ensurePlatformTable();
    const rows = await this.prismaService.client.$queryRaw<MailConfigRow[]>`
      SELECT ${this.rowSelect({ includeVerification: true })}
      FROM "public"."platform_mail_configs"
      ORDER BY created_at ASC
      LIMIT 1
    `;
    return rows[0] || null;
  }

  async getSchool() {
    return this.response(
      'School mail settings retrieved successfully',
      this.normalize(await this.schoolRow(), 'school'),
    );
  }

  async getPlatform() {
    const row = await this.platformRow();
    return this.response(
      'Platform mail settings retrieved successfully',
      this.normalize(row, 'platform'),
    );
  }

  async updateSchool(dto: UpdateMailConfigDto, userId?: string) {
    const clean = this.sanitize(dto);
    const schema = this.tenantSchema();
    const current = await this.schoolRow(schema);
    const password = clean.smtpPassword
      ? encryptCredential(clean.smtpPassword)
      : current?.smtpPasswordEncrypted || null;
    const resetVerification =
      clean.smtpPassword !== undefined ||
      clean.smtpHost !== current?.smtpHost ||
      clean.smtpPort !== current?.smtpPort ||
      clean.smtpUser !== current?.smtpUser ||
      clean.fromEmail !== current?.fromEmail;

    let rows: MailConfigRow[];
    if (current?.id) {
      rows = await this.prismaService.client.$queryRaw<MailConfigRow[]>`
        UPDATE ${this.tenantTable('school_mail_configs', schema)}
        SET
          provider = ${clean.provider || current.provider || 'smtp'},
          mode = ${clean.mode || current.mode || 'system'},
          is_active = ${!!clean.isActive},
          smtp_host = ${clean.smtpHost || null},
          smtp_port = ${clean.smtpPort || null},
          smtp_secure = ${!!clean.smtpSecure},
          smtp_user = ${clean.smtpUser || null},
          smtp_password_encrypted = ${password},
          from_name = ${clean.fromName || null},
          from_email = ${clean.fromEmail || null},
          reply_to_email = ${clean.replyToEmail || null},
          is_verified = CASE WHEN ${resetVerification} THEN false ELSE is_verified END,
          updated_by = CAST(${userId || null} AS uuid),
          updated_at = now()
        WHERE id = ${current.id}::uuid
        RETURNING ${this.rowSelect({ includeMode: true, includeVerification: true })}
      `;
    } else {
      rows = await this.prismaService.client.$queryRaw<MailConfigRow[]>`
        INSERT INTO ${this.tenantTable('school_mail_configs', schema)} (
          provider,
          mode,
          is_active,
          smtp_host,
          smtp_port,
          smtp_secure,
          smtp_user,
          smtp_password_encrypted,
          from_name,
          from_email,
          reply_to_email,
          updated_by
        )
        VALUES (
          ${clean.provider || 'smtp'},
          ${clean.mode || 'system'},
          ${false},
          ${clean.smtpHost || null},
          ${clean.smtpPort || null},
          ${!!clean.smtpSecure},
          ${clean.smtpUser || null},
          ${password},
          ${clean.fromName || null},
          ${clean.fromEmail || null},
          ${clean.replyToEmail || null},
          CAST(${userId || null} AS uuid)
        )
        RETURNING ${this.rowSelect({ includeMode: true, includeVerification: true })}
      `;
    }

    return this.response(
      'School mail settings updated successfully',
      this.normalize(rows[0], 'school'),
    );
  }

  async updateSchoolStatus(isActive: boolean, userId?: string) {
    const schema = this.tenantSchema();
    const current = await this.schoolRow(schema);
    if (isActive && current?.mode === 'own') this.ensureRequiredForActivation(current);
    const rows = await this.prismaService.client.$queryRaw<MailConfigRow[]>`
      UPDATE ${this.tenantTable('school_mail_configs', schema)}
      SET is_active = ${isActive}, updated_by = CAST(${userId || null} AS uuid), updated_at = now()
      WHERE id = ${current?.id || null}::uuid
      RETURNING ${this.rowSelect({ includeMode: true, includeVerification: true })}
    `;
    return this.response(
      isActive ? 'School mail enabled successfully' : 'School mail disabled successfully',
      this.normalize(rows[0], 'school'),
    );
  }

  async updatePlatform(dto: UpdateMailConfigDto, userId?: string) {
    const clean = this.sanitize(dto);
    const current = await this.platformRow();
    const password = clean.smtpPassword
      ? encryptCredential(clean.smtpPassword)
      : current?.smtpPasswordEncrypted || null;
    let rows: MailConfigRow[];
    if (current?.id) {
      rows = await this.prismaService.client.$queryRaw<MailConfigRow[]>`
        UPDATE "public"."platform_mail_configs"
        SET
          provider = ${clean.provider || current.provider || 'smtp'},
          is_active = ${clean.isActive ?? current.isActive ?? true},
          smtp_host = ${clean.smtpHost || null},
          smtp_port = ${clean.smtpPort || null},
          smtp_secure = ${!!clean.smtpSecure},
          smtp_user = ${clean.smtpUser || null},
          smtp_password_encrypted = ${password},
          from_name = ${clean.fromName || null},
          from_email = ${clean.fromEmail || null},
          reply_to_email = ${clean.replyToEmail || null},
          is_verified = false,
          updated_by = CAST(${userId || null} AS uuid),
          updated_at = now()
        WHERE id = ${current.id}::uuid
        RETURNING ${this.rowSelect({ includeVerification: true })}
      `;
    } else {
      rows = await this.prismaService.client.$queryRaw<MailConfigRow[]>`
        INSERT INTO "public"."platform_mail_configs" (
          provider,
          is_active,
          smtp_host,
          smtp_port,
          smtp_secure,
          smtp_user,
          smtp_password_encrypted,
          from_name,
          from_email,
          reply_to_email,
          updated_by
        )
        VALUES (
          ${clean.provider || 'smtp'},
          ${clean.isActive ?? true},
          ${clean.smtpHost || null},
          ${clean.smtpPort || null},
          ${!!clean.smtpSecure},
          ${clean.smtpUser || null},
          ${password},
          ${clean.fromName || null},
          ${clean.fromEmail || null},
          ${clean.replyToEmail || null},
          CAST(${userId || null} AS uuid)
        )
        RETURNING ${this.rowSelect({ includeVerification: true })}
      `;
    }

    return this.response(
      'Platform mail settings updated successfully',
      this.normalize(rows[0], 'platform'),
    );
  }

  private async testRow(row: MailConfigRow | null, to: string): Promise<void> {
    if (
      !row?.smtpHost ||
      !row?.smtpPort ||
      !row?.fromEmail ||
      (row?.smtpUser && !row?.smtpPasswordEncrypted)
    ) {
      throw new BadRequestException('Mail settings are incomplete');
    }
    const resolved: ResolvedTransport = {
      source: 'school',
      config: {
        smtpHost: row.smtpHost,
        smtpPort: row.smtpPort,
        smtpSecure: !!row.smtpSecure,
        smtpUser: row.smtpUser || '',
        smtpPassword: row.smtpPasswordEncrypted
          ? decryptCredential(row.smtpPasswordEncrypted)
          : null,
        fromName: row.fromName || 'NEXA School Management',
        fromEmail: row.fromEmail,
        replyToEmail: row.replyToEmail || '',
      },
    };
    await this.createTransport(resolved).sendMail({
      from: this.fromAddress(resolved.config),
      replyTo: resolved.config.replyToEmail || undefined,
      to,
      subject: 'NEXA mail configuration test',
      text: 'This test confirms that your mail configuration can send email.',
      html: '<p>This test confirms that your mail configuration can send email.</p>',
    });
  }

  async testSchool(dto: TestMailConfigDto, userId?: string) {
    const schema = this.tenantSchema();
    const current = await this.schoolRow(schema);
    try {
      await this.testRow(current, dto.to);
      const rows = await this.prismaService.client.$queryRaw<MailConfigRow[]>`
        UPDATE ${this.tenantTable('school_mail_configs', schema)}
        SET
          is_verified = true,
          last_verified_at = now(),
          last_test_status = 'success',
          last_test_error = NULL,
          last_failed_at = NULL,
          consecutive_failures = 0,
          updated_by = CAST(${userId || null} AS uuid),
          updated_at = now()
        WHERE id = ${current?.id || null}::uuid
        RETURNING ${this.rowSelect({ includeMode: true, includeVerification: true })}
      `;
      return this.response('Test email sent successfully', this.normalize(rows[0], 'school'));
    } catch (error) {
      await this.prismaService.client.$executeRaw`
        UPDATE ${this.tenantTable('school_mail_configs', schema)}
        SET
          is_verified = false,
          last_test_status = 'failed',
          last_test_error = ${error instanceof Error ? error.message : 'Mail test failed'},
          last_failed_at = now(),
          consecutive_failures = consecutive_failures + 1,
          updated_by = CAST(${userId || null} AS uuid),
          updated_at = now()
        WHERE id = ${current?.id || null}::uuid
      `;
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Mail test failed',
      );
    }
  }

  async testPlatform(dto: TestMailConfigDto, userId?: string) {
    const current = await this.platformRow();
    try {
      await this.testRow(current, dto.to);
      const rows = await this.prismaService.client.$queryRaw<MailConfigRow[]>`
        UPDATE "public"."platform_mail_configs"
        SET
          is_verified = true,
          last_verified_at = now(),
          last_test_status = 'success',
          last_test_error = NULL,
          last_tested_at = now(),
          last_failed_at = NULL,
          consecutive_failures = 0,
          updated_by = CAST(${userId || null} AS uuid),
          updated_at = now()
        WHERE id = ${current?.id || null}::uuid
        RETURNING ${this.rowSelect({ includeVerification: true })}
      `;
      return this.response('Platform test email sent successfully', this.normalize(rows[0], 'platform'));
    } catch (error) {
      await this.prismaService.client.$executeRaw`
        UPDATE "public"."platform_mail_configs"
        SET
          is_verified = false,
          last_test_status = 'failed',
          last_test_error = ${error instanceof Error ? error.message : 'Mail test failed'},
          last_tested_at = now(),
          last_failed_at = now(),
          consecutive_failures = consecutive_failures + 1,
          updated_by = CAST(${userId || null} AS uuid),
          updated_at = now()
        WHERE id = ${current?.id || null}::uuid
      `;
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Platform mail test failed',
      );
    }
  }

  async resolveTransport(schema = this.tenantSchema()): Promise<ResolvedTransport | null> {
    const school = await this.schoolRow(schema);
    if (
      school?.mode === 'own' &&
      school?.isActive &&
      school?.isVerified &&
      school.smtpHost &&
      school.smtpPort
    ) {
      return {
        source: 'school',
        config: {
          smtpHost: school.smtpHost,
          smtpPort: school.smtpPort,
          smtpSecure: !!school.smtpSecure,
          smtpUser: school.smtpUser || '',
          smtpPassword: school.smtpPasswordEncrypted
            ? decryptCredential(school.smtpPasswordEncrypted)
            : null,
          fromName: school.fromName || 'NEXA School Management',
          fromEmail: school.fromEmail || school.smtpUser || 'no-reply@nexa.local',
          replyToEmail: school.replyToEmail || '',
        },
      };
    }

    const platform = await this.platformRow();
    if (
      platform?.isActive &&
      platform?.isVerified &&
      platform.smtpHost &&
      platform.smtpPort
    ) {
      return {
        source: 'platform',
        config: {
          smtpHost: platform.smtpHost,
          smtpPort: platform.smtpPort,
          smtpSecure: !!platform.smtpSecure,
          smtpUser: platform.smtpUser || '',
          smtpPassword: platform.smtpPasswordEncrypted
            ? decryptCredential(platform.smtpPasswordEncrypted)
            : null,
          fromName: platform.fromName || 'NEXA School Management',
          fromEmail: platform.fromEmail || platform.smtpUser || 'no-reply@nexa.local',
          replyToEmail: platform.replyToEmail || '',
        },
      };
    }

    return null;
  }

  async resolvePlatformTransport(): Promise<ResolvedTransport | null> {
    const platform = await this.platformRow();
    if (
      platform?.isActive &&
      platform?.isVerified &&
      platform.smtpHost &&
      platform.smtpPort
    ) {
      return {
        source: 'platform',
        config: {
          smtpHost: platform.smtpHost,
          smtpPort: platform.smtpPort,
          smtpSecure: !!platform.smtpSecure,
          smtpUser: platform.smtpUser || '',
          smtpPassword: platform.smtpPasswordEncrypted
            ? decryptCredential(platform.smtpPasswordEncrypted)
            : null,
          fromName: platform.fromName || 'NEXA School Management',
          fromEmail: platform.fromEmail || platform.smtpUser || 'no-reply@nexa.local',
          replyToEmail: platform.replyToEmail || '',
        },
      };
    }
    return null;
  }

  async sendTenantMail(params: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    schema?: string;
  }) {
    const resolved = await this.resolveTransport(params.schema);
    if (!resolved) {
      return {
        sent: false,
        skipped: true,
        reason: 'Mail is not configured',
        source: null,
      };
    }
    await this.createTransport(resolved).sendMail({
      from: this.fromAddress(resolved.config),
      replyTo: resolved.config.replyToEmail || undefined,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return {
      sent: true,
      skipped: false,
      reason: null,
      source: resolved.source,
    };
  }

  async sendPlatformMail(params: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }) {
    const resolved = await this.resolvePlatformTransport();
    if (!resolved) {
      return {
        sent: false,
        skipped: true,
        reason: 'Platform mail is not configured',
        source: null,
      };
    }

    await this.createTransport(resolved).sendMail({
      from: this.fromAddress(resolved.config),
      replyTo: resolved.config.replyToEmail || undefined,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    return {
      sent: true,
      skipped: false,
      reason: null,
      source: resolved.source,
    };
  }
}
