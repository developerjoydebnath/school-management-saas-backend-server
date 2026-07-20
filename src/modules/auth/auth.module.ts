import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  PrismaService,
  TenantConnectionService,
} from '../../cores/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MailQueueModule } from '../mail-queue/mail-queue.module';
import { UsernamesModule } from '../usernames/usernames.module';

@Module({
  imports: [
    PassportModule,
    MailQueueModule,
    UsernamesModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TenantConnectionService, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
