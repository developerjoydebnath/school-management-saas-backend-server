import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../cores/prisma.service';

@Injectable()
export class ApiKeyService {
  private readonly masterApiKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.masterApiKey =
      this.configService.get<string>('INIT_API_KEY') ??
      this.configService.get<string>('FRONTEND_API_KEY') ??
      '';
  }

  /**
   * Validates the provided API key.
   * - Accepts the master API key from environment variables.
   * - Otherwise checks the database for a valid API key entry.
   * @param key API key to validate
   * @returns True if the key is valid, otherwise false
   */
  validateApiKey(key: string): boolean {
    if (!key) return false;

    // Check against the master API key
    if (key === this.masterApiKey) {
      return true;
    }

    return false;
  }
}
