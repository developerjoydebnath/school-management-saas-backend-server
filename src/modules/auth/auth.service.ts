import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  PrismaService,
  TenantConnectionService,
} from '../../cores/prisma.service';
import { MailQueueService } from '../mail-queue/mail-queue.service';
import { UsernamesService } from '../usernames/usernames.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private tenantConnection: TenantConnectionService,
    private prismaService: PrismaService,
    private readonly mailQueueService: MailQueueService,
    private readonly usernamesService: UsernamesService,
  ) {}

  async signUp(dto: SignUpDto) {
    await this.usernamesService.ensureRuntimeObjects();
    const schemaName = this.tenantConnection.getTenantSchema();
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user in global public.users table
    const user = await this.prismaService.user.create({
      data: {
        username: dto.email.trim().toLowerCase(),
        email: dto.email,
        password: hashedPassword,
        schemaName,
        role:
          (dto.role?.toUpperCase() as import('@prisma/client').Role) || 'USER',
        isActive: true,
      },
    });

    // Get tenant-specific Prisma client
    const tenantPrisma: import('@prisma/client').PrismaClient =
      this.tenantConnection.getTenantClient();

    // Create profile in tenant schema
    const profile = await tenantPrisma.userProfile.create({
      data: {
        userId: user.id,
        firstName: dto.name || 'Unknown',
        lastName: '',
      },
    });

    return {
      message: 'User registered successfully',
      data: {
        user: { id: user.id, email: user.email },
        profileId: profile.id,
      },
    };
  }

  /**
   * Multi-identifier login:
   *   - Student ID  → STU-YYYY-NNN  (student_code column)
   *   - BD phone    → 01XXXXXXXXX   (phone column)
   *   - Email       → contains '@'  (email column)
   *
   * All three paths resolve to the same public.users row.
   * No raw SQL — uses Prisma typed where with a dynamic field key.
   */
  async signIn(dto: SignInDto) {
    await this.usernamesService.ensureRuntimeObjects();
    const schemaName = this.tenantConnection.getTenantSchema();
    const { password } = dto;
    const identifier = dto.identifier.trim();

    // ── Detect identifier type ────────────────────────────────────────────────
    const isStudentCode =
      /^STU-\d{4}-\d+$/i.test(identifier) ||
      /^STU-[A-Z0-9]{2,10}-\d+$/i.test(identifier);
    const isPhone = /^01[3-9]\d{8}$/.test(identifier);
    const isEmail = identifier.includes('@');

    if (!isStudentCode && !isPhone && !isEmail) {
      throw new UnauthorizedException(
        'Enter a valid Student ID, phone number, or email address',
      );
    }

    // ── Build a type-safe Prisma where clause ─────────────────────────────────
    // Partial indexes are used in DB, so we use findFirst.
    let user: Awaited<ReturnType<typeof this.prismaService.user.findFirst>>;

    if (isStudentCode) {
      user = await this.prismaService.user.findFirst({
        where: {
          schemaName,
          deletedAt: null,
          OR: [
            { studentCode: identifier.toUpperCase() },
            { username: identifier.toUpperCase() },
          ],
        },
      });
    } else if (isPhone) {
      user = await this.prismaService.user.findFirst({
        where: { phone: identifier, schemaName },
      });
    } else {
      user = await this.prismaService.user.findFirst({
        where: { email: identifier, schemaName, role: { not: Role.STUDENT } },
      });
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role === Role.STUDENT && !isStudentCode) {
      throw new UnauthorizedException('Students must sign in with Student ID');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // ── Update lastLogin ──────────────────────────────────────────────────────
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // ── Fetch tenant profile ──────────────────────────────────────────────────
    const tenantPrisma: import('@prisma/client').PrismaClient =
      this.tenantConnection.getTenantClient();

    const profile = await tenantPrisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found in this school');
    }

    // ── Issue tokens ──────────────────────────────────────────────────────────
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      studentCode: user.studentCode,
      username: user.username,
      schema: user.schemaName,
      role: user.role,
      profileId: profile.id,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '20m' });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '15d',
      secret: process.env.JWT_REFRESH_SECRET,
    });
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });

    return {
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          userId: user.id,
          email: user.email,
          phone: user.phone,
          studentCode: user.studentCode,
          username: user.username,
          schema: user.schemaName,
          role: user.role,
          profileId: profile.id,
        },
      },
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.hashedRefreshToken) {
        throw new UnauthorizedException('Access denied');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        token,
        user.hashedRefreshToken,
      );
      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Access denied');
      }

      // Generate new tokens
      const newPayload = {
        sub: user.id,
        email: user.email,
        schema: user.schemaName,
        role: user.role,
        profileId: payload.profileId,
      };

      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: '7d',
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const newHashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

      await this.prismaService.user.update({
        where: { id: user.id },
        data: { hashedRefreshToken: newHashedRefreshToken },
      });

      return {
        message: 'Token refreshed successfully',
        data: {
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.prismaService.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string) {
    const schemaName = this.tenantConnection.getTenantSchema();
    const user = await this.prismaService.user.findFirst({
      where: { email, schemaName, role: { not: Role.STUDENT } },
    });

    if (!user) {
      // Don't leak if user exists or not
      return {
        message:
          'If the email is registered, a password reset OTP has been sent.',
      };
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15); // 15 mins expiry

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        resetOtp: hashedOtp,
        resetOtpExpires: expires,
      },
    });

    await this.mailQueueService.enqueue({
      scope: 'tenant',
      schema: schemaName,
      to: user.email ?? '',
      subject: 'Password Reset OTP',
      text: `Your password reset OTP is ${otp}. It is valid for 15 minutes.`,
      html: `<p>Your password reset OTP is <b>${otp}</b>. It is valid for 15 minutes.</p>`,
    });

    return {
      message:
        'If the email is registered, a password reset OTP has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const schemaName = this.tenantConnection.getTenantSchema();
    const user = await this.prismaService.user.findFirst({
      where: { email: dto.email, schemaName, role: { not: Role.STUDENT } },
    });

    if (!user || !user.resetOtp || !user.resetOtpExpires) {
      throw new UnauthorizedException('Invalid OTP or email');
    }

    if (user.resetOtpExpires < new Date()) {
      throw new UnauthorizedException('OTP has expired');
    }

    const isOtpValid = await bcrypt.compare(dto.otp, user.resetOtp);
    if (!isOtpValid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prismaService.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetOtp: null,
        resetOtpExpires: null,
        hashedRefreshToken: null, // Force re-login on all devices after password reset
      },
    });

    return { message: 'Password reset successfully' };
  }
}
