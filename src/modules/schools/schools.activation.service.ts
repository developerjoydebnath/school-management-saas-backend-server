import { Injectable, Logger } from '@nestjs/common';
import { Role, School } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../cores/prisma.service';
import { InventorySeedService } from '../inventory/inventory-seed.service';
import { MailQueueService } from '../mail-queue/mail-queue.service';
import { SchoolsMigrationService } from './schools.migration.service';
import { UsernamesService } from '../usernames/usernames.service';
import { getWelcomeEmailTemplate } from './templates/welcome-email.template';
import { getRejectionEmailTemplate } from './templates/rejection-email.template';
import { getConfirmationEmailTemplate } from './templates/confirmation-email.template';

@Injectable()
export class SchoolsActivationService {
  private readonly logger = new Logger(SchoolsActivationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly migrationService: SchoolsMigrationService,
    private readonly inventorySeedService: InventorySeedService,
    private readonly mailQueueService: MailQueueService,
    private readonly usernamesService: UsernamesService,
  ) {}

  /**
   * The unified activation pipeline.
   * Runs for BOTH public request approvals and direct superadmin creation.
   *
   * Steps (all inside one DB transaction):
   *  1. Create the PostgreSQL schema
   *  2. Clone tables from tenant_template
   *  3. Seed default data
   *  4. Create the school admin user in public.users + tenant user_profiles
   *  5. Update school status → active
   *
   * After transaction: send welcome email (fire-and-forget — does not block).
   */
  async activateSchool(
    school: School,
    adminId: string,
    adminName: string,
    existingTx?: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
  ): Promise<void> {
    this.logger.log(
      `Starting activation pipeline for school: ${school.schoolSlug} (ID: ${school.id})`,
    );

    const tempPassword = this.generateTempPassword();
    let createdUserId: string | null = null;

    const runActivation = async (
      tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    ) => {
      // Step 1 — Create PostgreSQL schema
      await this.migrationService.createTenantSchema(tx, school.schoolSlug);

      // Step 2 — Clone table structure from tenant_template
      await this.migrationService.cloneTenantTables(tx, school.schoolSlug);

      await this.inventorySeedService.seedTenantSchema(
        this.migrationService.toSchemaName(school.schoolSlug),
        tx,
      );

      // Step 3 — Create school admin user
      createdUserId = await this.createSchoolAdminUser(
        tx,
        school,
        adminName,
        tempPassword,
      );

      // Step 4 — Mark school as active
      await tx.school.update({
        where: { id: school.id },
        data: {
          status: 'active',
          activatedAt: new Date(),
          activatedBy: adminId,
          adminUserId: createdUserId,
        },
      });
    };

    if (existingTx) {
      await runActivation(existingTx);
    } else {
      await this.prisma.$transaction(runActivation, {
        timeout: 30000,
      });
    }

    this.logger.log(
      `Activation transaction complete for: ${school.schoolSlug}`,
    );

    // Send welcome email outside the transaction (fire-and-forget)
    this.sendWelcomeEmail(school, tempPassword).catch((err) => {
      this.logger.error(
        `Failed to send welcome email to ${school.contactEmail}: ${err.message}`,
      );
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async createSchoolAdminUser(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    school: School,
    adminName: string,
    tempPassword: string,
  ): Promise<string> {
    const schema = this.migrationService.toSchemaName(school.schoolSlug);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    this.logger.log(
      `  Creating school admin user in public.users (email: ${school.contactEmail})`,
    );
    const username = await this.usernamesService.generateForSchool(
      school.id,
      Role.SCHOOL_ADMIN,
      tx,
    );

    // Insert into global public.users table via Prisma
    const user = await tx.user.create({
      data: {
        username,
        email: school.contactEmail,
        phone: school.contactPhone,
        password: hashedPassword,
        schemaName: schema,
        role: 'SCHOOL_ADMIN',
        isActive: true,
      },
    });

    this.logger.log(`  School admin user created: ${user.id}`);

    // Insert profile into tenant schema
    const profileExists = await tx.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = ${schema}
          AND table_name   = 'user_profiles'
      ) AS exists
    `;

    if (profileExists[0]?.exists) {
      await tx.$executeRawUnsafe(
        `INSERT INTO "${schema}".user_profiles (user_id, full_name, phone)
         VALUES ($1::uuid, $2, $3)`,
        user.id,
        adminName,
        school.contactPhone,
      );
      this.logger.log(
        `  School admin profile created in "${schema}".user_profiles`,
      );
    } else {
      this.logger.warn(
        `  Table "${schema}".user_profiles not found — profile not created in tenant schema.`,
      );
    }

    // Also create the profile in the public schema
    const nameParts = adminName.trim().split(' ');
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || '';

    await tx.userProfile.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        phone: school.contactPhone,
      },
    });
    this.logger.log(`  School admin profile created in public.user_profiles`);

    return user.id;
  }

  private generateTempPassword(): string {
    // Generates something like: Edu@xK9m2p
    return (
      'Edu@' +
      crypto
        .randomBytes(6)
        .toString('base64')
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 8)
    );
  }

  private async sendWelcomeEmail(
    school: School,
    tempPassword: string,
  ): Promise<void> {
    const appDomain = process.env.APP_DOMAIN || 'yourdomain.com';
    const subdomain = `${school.schoolSlug}.${appDomain}`;

    const result = await this.mailQueueService.enqueue({
      scope: 'platform',
      to: school.contactEmail,
      subject: `Welcome to EduCore — Your school is ready!`,
      html: getWelcomeEmailTemplate(
        school.schoolName,
        subdomain,
        school.contactEmail,
        tempPassword,
      ),
    });

    if (result.queued) {
      this.logger.log(`Welcome email queued for: ${school.contactEmail}`);
    } else {
      this.logger.warn(
        `Welcome email not queued for ${school.contactEmail}: ${result.reason}`,
      );
    }
  }

  async sendRejectionEmail(
    school: School,
    adminName: string,
    reason?: string,
  ): Promise<void> {
    const result = await this.mailQueueService.enqueue({
      scope: 'platform',
      to: school.contactEmail,
      subject: `Update on your EduCore application — ${school.schoolName}`,
      html: getRejectionEmailTemplate(school.schoolName, adminName, reason),
    });

    if (!result.queued) {
      this.logger.warn(
        `Rejection email not queued for ${school.contactEmail}: ${result.reason}`,
      );
    }
  }

  async sendConfirmationEmail(
    schoolName: string,
    adminName: string,
    contactEmail: string,
  ): Promise<void> {
    const result = await this.mailQueueService.enqueue({
      scope: 'platform',
      to: contactEmail,
      subject: `We received your application — ${schoolName}`,
      html: getConfirmationEmailTemplate(schoolName, adminName),
    });

    if (!result.queued) {
      this.logger.warn(
        `Confirmation email not queued for ${contactEmail}: ${result.reason}`,
      );
    }
  }
}
