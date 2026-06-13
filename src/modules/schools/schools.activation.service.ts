import { Injectable, Logger } from '@nestjs/common';
import { School } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../cores/prisma.service';
import { SchoolsMigrationService } from './schools.migration.service';

@Injectable()
export class SchoolsActivationService {
  private readonly logger = new Logger(SchoolsActivationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly migrationService: SchoolsMigrationService,
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
  ): Promise<void> {
    this.logger.log(
      `Starting activation pipeline for school: ${school.schoolSlug} (ID: ${school.id})`,
    );

    const tempPassword = this.generateTempPassword();
    let createdUserId: string | null = null;

    await this.prisma.$transaction(
      async (tx) => {
        // Step 1 — Create PostgreSQL schema
        await this.migrationService.createTenantSchema(tx, school.schoolSlug);

        // Step 2 — Clone table structure from tenant_template
        await this.migrationService.cloneTenantTables(tx, school.schoolSlug);

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
      },
      {
        // Schema creation + migrations can take a few seconds
        timeout: 30000,
      },
    );

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

    const names = adminName.split(' ');
    const firstName = names[0];
    const lastName = names.length > 1 ? names.slice(1).join(' ') : '';

    // Insert into global public.users table via Prisma
    const user = await tx.user.create({
      data: {
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
        `INSERT INTO "${schema}".user_profiles (user_id, first_name, last_name, phone)
         VALUES ($1::uuid, $2, $3, $4)`,
        user.id,
        firstName,
        lastName,
        school.contactPhone,
      );
      this.logger.log(
        `  School admin profile created in "${schema}".user_profiles`,
      );
    } else {
      this.logger.warn(
        `  Table "${schema}".user_profiles not found — profile not created.`,
      );
    }

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

  private getTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private async sendWelcomeEmail(
    school: School,
    tempPassword: string,
  ): Promise<void> {
    const appDomain = process.env.APP_DOMAIN || 'yourdomain.com';
    const subdomain = `${school.schoolSlug}.${appDomain}`;

    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: `"EduCore" <${process.env.SMTP_USER}>`,
      to: school.contactEmail,
      subject: `Welcome to EduCore — Your school is ready!`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <h2>Welcome to EduCore, ${school.schoolName}! 🎉</h2>
          <p>Your school account has been successfully set up.</p>
          <hr />
          <h3>Login Details</h3>
          <p><strong>URL:</strong> <a href="https://${subdomain}">https://${subdomain}</a></p>
          <p><strong>Email:</strong> ${school.contactEmail}</p>
          <p><strong>Temporary Password:</strong> <code>${tempPassword}</code></p>
          <p style="color: #e53e3e;">⚠️ Please change your password immediately after first login.</p>
          <hr />
          <p>If you have any questions, reply to this email.</p>
          <p>— The EduCore Team</p>
        </div>
      `,
    });

    this.logger.log(`Welcome email sent to: ${school.contactEmail}`);
  }

  async sendRejectionEmail(
    school: School,
    adminName: string,
    reason?: string,
  ): Promise<void> {
    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: `"EduCore" <${process.env.SMTP_USER}>`,
      to: school.contactEmail,
      subject: `Update on your EduCore application — ${school.schoolName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <h2>Application Update</h2>
          <p>Dear ${adminName},</p>
          <p>We have reviewed your application for <strong>${school.schoolName}</strong> and unfortunately we are unable to approve it at this time.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>You may re-apply after addressing the stated concerns. If you believe this is an error, please contact our support team.</p>
          <p>— The EduCore Team</p>
        </div>
      `,
    });
  }

  async sendConfirmationEmail(
    schoolName: string,
    adminName: string,
    contactEmail: string,
  ): Promise<void> {
    const transporter = this.getTransporter();
    await transporter.sendMail({
      from: `"EduCore" <${process.env.SMTP_USER}>`,
      to: contactEmail,
      subject: `We received your application — ${schoolName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
          <h2>Application Received ✅</h2>
          <p>Dear ${adminName},</p>
          <p>Thank you for applying to join <strong>EduCore</strong>. We have received your request for <strong>${schoolName}</strong>.</p>
          <p>Our team will review your application and get back to you within 2–3 business days.</p>
          <p>— The EduCore Team</p>
        </div>
      `,
    });
  }
}
