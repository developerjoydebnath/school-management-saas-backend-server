import { Inject, Injectable, OnModuleDestroy, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import type { Request } from 'express';
import { softDeleteExtension } from '../common/utils/soft-delete.extension';

interface TenantRequest extends Request {
  tenant?: string;
  academicSessionId?: string;
}

// Cache for PrismaClient instances
const prismaClients: Record<string, PrismaClient> = {};

@Injectable({ scope: Scope.REQUEST })
export class TenantConnectionService implements OnModuleDestroy {
  constructor(@Inject(REQUEST) private request: Request) {}

  async onModuleDestroy() {
    // Note: Disconnecting all clients on module destroy is handled globally,
    // not per request-scoped instance, to avoid killing cached connections.
  }

  /**
   * Returns the current tenant schema name extracted from the request.
   */
  getTenantSchema(): string {
    const req = this.request as TenantRequest;
    return req.tenant || 'public';
  }

  /**
   * Returns the globally selected academic session from the request context.
   *
   * Feature services should opt in to this only when their data is session-scoped
   * (for example students, admissions, exams, timetables, and syllabuses).
   */
  getAcademicSessionId(): string | null {
    const req = this.request as TenantRequest;
    return req.academicSessionId || null;
  }

  /**
   * Retrieves or creates a cached PrismaClient for the current tenant's schema.
   */
  getTenantClient(): PrismaClient {
    const req = this.request as TenantRequest;
    const tenantSchema = req.tenant || 'public';

    if (!prismaClients[tenantSchema]) {
      // Build the dynamic URL with the schema query param
      const dbUrl = new URL(
        process.env.DATABASE_URL ||
          'postgresql://postgres:password@localhost:5432/postgres',
      );
      dbUrl.searchParams.set('schema', tenantSchema);

      // Create and cache the PrismaClient for this tenant
      prismaClients[tenantSchema] = new PrismaClient({
        datasources: {
          db: {
            url: dbUrl.toString(),
          },
        },
      });
      // Optionally connect immediately
      // prismaClients[tenantSchema].$connect();
    }

    return prismaClients[tenantSchema];
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  /**
   * The extended client has the soft-delete extension applied.
   * Use this for all application queries — deleted records are invisible.
   *
   *   constructor(private prisma: PrismaService) {}
   *   const user = await this.prisma.client.user.findMany(); // never returns deleted
   */
  readonly client: ReturnType<typeof this._buildExtendedClient>;

  constructor() {
    super();
    this.client = this._buildExtendedClient();
  }

  private _buildExtendedClient() {
    return this.$extends(softDeleteExtension());
  }

  /**
   * Raw (unextended) client — use ONLY for admin restore / audit operations
   * where you explicitly need to see or update soft-deleted records.
   *
   *   const deleted = await this.prisma.raw.user.findMany({
   *     where: { deletedAt: { not: null } },
   *   });
   */
  get raw(): PrismaClient {
    return this;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
