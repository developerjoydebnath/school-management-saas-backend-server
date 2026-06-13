import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../cores/prisma.service';

@Injectable()
export class SchoolsMigrationService {
  private readonly logger = new Logger(SchoolsMigrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Converts a school slug to a valid PostgreSQL schema identifier.
   * e.g. "dhaka-model-school" → "dhaka_model_school"
   */
  toSchemaName(slug: string): string {
    return slug
      .toLowerCase()
      .replace(/-/g, '_') // hyphens → underscores
      .replace(/[^a-z0-9_]/g, '') // strip anything else
      .replace(/^(\d)/, 's$1'); // can't start with a number
  }

  /**
   * Creates a new PostgreSQL schema for the tenant.
   * Throws ConflictException if schema already exists.
   */
  async createTenantSchema(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    slug: string,
  ): Promise<void> {
    const schemaName = this.toSchemaName(slug);
    this.logger.log(`Creating tenant schema: ${schemaName}`);

    const existing = await tx.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name = ${schemaName}
    `;

    if (existing.length > 0) {
      throw new ConflictException(
        `Schema "${schemaName}" already exists. School slug conflict.`,
      );
    }

    await tx.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);
    this.logger.log(`Schema "${schemaName}" created successfully.`);
  }

  /**
   * Clones all tables from the "tenant_template" schema into the new tenant schema.
   * Uses CREATE TABLE ... (LIKE ... INCLUDING ALL) for columns, defaults, indexes, checks.
   * Foreign keys are excluded by LIKE and must be added separately.
   */
  async cloneTenantTables(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    slug: string,
  ): Promise<void> {
    const schemaName = this.toSchemaName(slug);
    this.logger.log(`Cloning tables from tenant_template into: ${schemaName}`);

    // Verify tenant_template schema exists
    const templateExists = await tx.$queryRaw<{ schema_name: string }[]>`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name = 'tenant_template'
    `;

    if (templateExists.length === 0) {
      throw new InternalServerErrorException(
        'tenant_template schema does not exist. Please run the template migration first.',
      );
    }

    // Get all tables from tenant_template in dependency order (by ordinal)
    const tables = await tx.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'tenant_template'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    if (tables.length === 0) {
      this.logger.warn('No tables found in tenant_template schema.');
      return;
    }

    // Clone each table structure
    for (const { table_name } of tables) {
      this.logger.log(`  Cloning table: ${table_name}`);
      await tx.$executeRawUnsafe(`
        CREATE TABLE "${schemaName}"."${table_name}"
        (LIKE tenant_template."${table_name}" INCLUDING ALL)
      `);
    }

    // Now re-add cross-schema foreign key constraints
    // user_profiles.user_id → public.users.id
    const hasUserProfiles = tables.some(
      (t) => t.table_name === 'user_profiles',
    );
    if (hasUserProfiles) {
      await tx.$executeRawUnsafe(`
        ALTER TABLE "${schemaName}".user_profiles
        ADD CONSTRAINT "fk_user_profiles_user_id"
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
      `);
      this.logger.log(`  Added FK: user_profiles.user_id → public.users.id`);
    }

    this.logger.log(
      `Cloned ${tables.length} tables into schema "${schemaName}".`,
    );
  }
}
