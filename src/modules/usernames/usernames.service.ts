import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/cores/prisma.service';

type DbClient = {
  $executeRawUnsafe: (...args: any[]) => Promise<any>;
  $queryRaw: any;
  school: any;
};

const USERNAME_PREFIX: Partial<Record<Role, string>> = {
  [Role.STUDENT]: 'STU',
  [Role.PARENT]: 'PAR',
  [Role.SCHOOL_STAFF]: 'STF',
  [Role.TEACHER]: 'TCH',
  [Role.SCHOOL_ADMIN]: 'ADM',
};

@Injectable()
export class UsernamesService implements OnModuleInit {
  private readonly logger = new Logger(UsernamesService.name);
  private runtimeReady = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureRuntimeObjects();
    } catch (error: any) {
      this.logger.warn(
        `Username runtime setup was skipped: ${error?.message || error}`,
      );
    }
  }

  async ensureRuntimeObjects() {
    if (this.runtimeReady) return;

    await this.prisma.$executeRawUnsafe(
      'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username VARCHAR(50)',
    );
    await this.prisma.$executeRawUnsafe(`
      UPDATE public.users
      SET username = COALESCE(
        student_code,
        left(schema_name || '-' || email, 50),
        left(schema_name || '-' || phone, 50),
        role::text || '-' || substr(id::text, 1, 8)
      )
      WHERE username IS NULL
    `);
    await this.prisma.$executeRawUnsafe(
      'ALTER TABLE public.users ALTER COLUMN username SET NOT NULL',
    );
    await this.prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS users_username_active_idx ON public.users (username) WHERE deleted_at IS NULL',
    );
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.school_user_sequences (
        id uuid PRIMARY KEY DEFAULT uuidv7(),
        school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
        role public."Role" NOT NULL,
        last_value integer NOT NULL DEFAULT 0
      )
    `);
    await this.prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX IF NOT EXISTS school_user_sequences_school_id_role_key ON public.school_user_sequences (school_id, role)',
    );
    await this.prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS school_user_sequences_school_id_idx ON public.school_user_sequences (school_id)',
    );

    this.runtimeReady = true;
  }

  async generateForSchool(
    schoolId: string,
    role: Role,
    client: DbClient = this.prisma,
  ) {
    await this.ensureRuntimeObjects();

    const prefix = USERNAME_PREFIX[role];
    if (!prefix) {
      throw new BadRequestException(`Username generation is not configured for ${role}`);
    }

    const school = await client.school.findUnique({
      where: { id: schoolId },
      select: { schoolShortCode: true },
    });
    const shortCode = String(school?.schoolShortCode || '').trim().toUpperCase();
    if (!shortCode) {
      throw new BadRequestException('School short code is required before creating users');
    }

    const rows = await client.$queryRaw<{ lastValue: number }[]>`
      INSERT INTO public.school_user_sequences (id, school_id, role, last_value)
      VALUES (uuidv7(), ${schoolId}::uuid, CAST(${role} AS public."Role"), 1)
      ON CONFLICT (school_id, role)
      DO UPDATE SET last_value = public.school_user_sequences.last_value + 1
      RETURNING last_value AS "lastValue"
    `;
    const sequence = rows[0]?.lastValue ?? 1;
    return `${prefix}-${shortCode}-${String(sequence).padStart(5, '0')}`;
  }

  resolveEffectiveSchemaName(schemaName?: string | null) {
    const normalized = String(schemaName || '').trim() || 'public';
    if (normalized !== 'public') return normalized;

    return (
      process.env.PLATFORM_TEST_TENANT_SCHEMA ||
      process.env.DEFAULT_TENANT_SCHEMA ||
      process.env.DEV_TENANT_SCHEMA ||
      'tenant'
    );
  }

  async generateForSchema(
    schemaName: string,
    role: Role,
    client: DbClient = this.prisma,
  ) {
    await this.ensureRuntimeObjects();

    const effectiveSchemaName = this.resolveEffectiveSchemaName(schemaName);
    const schemaCandidates = Array.from(
      new Set(
        [
          schemaName,
          schemaName?.replace(/_/g, '-'),
          effectiveSchemaName,
          effectiveSchemaName.replace(/_/g, '-'),
        ]
          .map((value) => String(value || '').trim())
          .filter((value) => value && value !== 'public'),
      ),
    );

    let school = await client.school.findFirst({
      where: {
        deletedAt: null,
        OR: schemaCandidates.map((schoolSlug) => ({ schoolSlug })),
      },
      select: { id: true },
    });

    if (
      !school &&
      ['public', 'tenant', 'tenant_template'].includes(schemaName)
    ) {
      school = await client.school.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
    }

    if (!school) {
      throw new BadRequestException(
        `School not found for schema "${schemaName}". Configure school short code first.`,
      );
    }

    return this.generateForSchool(school.id, role, client);
  }
}
