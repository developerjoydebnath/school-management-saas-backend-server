import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../cores/prisma.service';

type PortalHostType = 'marketing' | 'school';

type ResolveResult = {
  type: PortalHostType;
  host: string;
  school?: Record<string, any>;
  tenantSchema?: string;
};

function normalizeHost(host?: string | null) {
  return (host || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];
}

function extractSubdomain(host: string) {
  const parts = host.split('.');
  if (parts.length >= 3 && parts[0] && parts[0] !== 'www') {
    return parts[0];
  }
  return null;
}

function toSchemaName(slug: string) {
  return slug
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^(\d)/, 's$1');
}

function isMarketingHost(host: string) {
  return (
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === 'lvh.me' ||
    host === 'www.lvh.me'
  );
}

@Injectable()
export class PublicPortalService {
  constructor(private readonly prisma: PrismaService) {}

  private response(message: string, data: unknown) {
    return {
      success: true,
      statusCode: 200,
      message,
      data,
      meta: null,
    };
  }

  private schoolSelect() {
    return {
      id: true,
      schoolName: true,
      schoolNameBn: true,
      schoolSlug: true,
      schoolType: true,
      medium: true,
      educationLevel: true,
      shift: true,
      address: true,
      postCode: true,
      contactEmail: true,
      contactPhone: true,
      alternatePhone: true,
      website: true,
      eiin: true,
      establishedYear: true,
      facebookPage: true,
      youtubeChannel: true,
      logoUrl: true,
      logoPlaceholder: true,
      bannerUrl: true,
      bannerPlaceholder: true,
      customDomain: true,
      customDomainVerified: true,
      isCustomDomainEnabled: true,
      status: true,
      portalTemplateId: true,
      portalPrimaryColor: true,
      portalTheme: true,
      portalSections: true,
      portalTagline: true,
      portalAboutText: true,
      portalIsLive: true,
      portalPublishedAt: true,
      portalVersion: true,
      division: { select: { id: true, name: true, bnName: true } },
      district: { select: { id: true, name: true, bnName: true } },
      upazila: { select: { id: true, name: true, bnName: true } },
    };
  }

  async resolve(hostInput?: string | null): Promise<ResolveResult> {
    const host = normalizeHost(hostInput);
    if (isMarketingHost(host)) {
      return { type: 'marketing', host };
    }

    const subdomain = extractSubdomain(host);
    const prisma = this.prisma.raw as any;

    const school = await prisma.school.findFirst({
      where: subdomain
        ? {
            schoolSlug: subdomain,
            deletedAt: null,
            status: { in: ['active', 'trial'] },
          }
        : {
            customDomain: host,
            isCustomDomainEnabled: true,
            customDomainVerified: true,
            deletedAt: null,
            status: { in: ['active', 'trial'] },
          },
      select: this.schoolSelect(),
    });

    if (!school) {
      throw new NotFoundException('Public portal not found');
    }

    return {
      type: 'school',
      host,
      school,
      tenantSchema: toSchemaName(school.schoolSlug),
    };
  }

  async resolveResponse(host?: string | null) {
    return this.response('Public portal resolved successfully', await this.resolve(host));
  }

  async config(host?: string | null) {
    const resolved = await this.resolve(host);
    if (resolved.type === 'marketing') {
      return this.response('Marketing portal config retrieved successfully', resolved);
    }

    return this.response('Public portal config retrieved successfully', {
      ...resolved,
      isLive: Boolean(resolved.school?.portalIsLive),
      templateKey: resolved.school?.portalTemplateId || 'classic',
      version: resolved.school?.portalVersion || 1,
    });
  }

  async home(host?: string | null) {
    const resolved = await this.resolve(host);
    if (resolved.type === 'marketing') {
      return this.response('Marketing home retrieved successfully', resolved);
    }

    const [notices, events, pages] = await Promise.all([
      this.publicRows(resolved.tenantSchema!, 'public_portal_notices', [
        'id',
        'title',
        'title_bn',
        'content',
        'is_pinned',
        'published_at',
      ], 'is_pinned DESC, published_at DESC NULLS LAST, created_at DESC', 5, true),
      this.publicRows(resolved.tenantSchema!, 'public_portal_events', [
        'id',
        'title',
        'title_bn',
        'description',
        'location',
        'start_at',
        'end_at',
        'image_url',
        'image_placeholder',
      ], 'start_at ASC', 4),
      this.publicRows(resolved.tenantSchema!, 'public_portal_pages', [
        'id',
        'slug',
        'title',
        'title_bn',
        'excerpt',
      ], 'sort_order ASC, published_at DESC NULLS LAST', 6),
    ]);

    return this.response('Public portal home retrieved successfully', {
      ...resolved,
      notices,
      events,
      pages,
    });
  }

  async page(host: string | null | undefined, slug: string) {
    const resolved = await this.resolve(host);
    if (resolved.type !== 'school') {
      throw new NotFoundException('Page not found');
    }

    const rows = await this.prisma.raw.$queryRawUnsafe<any[]>(
      `SELECT id, slug, title, title_bn AS "titleBn", excerpt, content, published_at AS "publishedAt"
       FROM "${resolved.tenantSchema}"."public_portal_pages"
       WHERE slug = $1 AND status = 'published' AND deleted_at IS NULL
       LIMIT 1`,
      slug,
    );

    if (!rows[0]) throw new NotFoundException('Page not found');
    return this.response('Public portal page retrieved successfully', rows[0]);
  }

  async notices(host?: string | null) {
    const resolved = await this.resolve(host);
    if (resolved.type !== 'school') {
      return this.response('Public portal notices retrieved successfully', []);
    }
    return this.response(
      'Public portal notices retrieved successfully',
      await this.publicRows(resolved.tenantSchema!, 'public_portal_notices', [
        'id',
        'title',
        'title_bn',
        'content',
        'is_pinned',
        'published_at',
        'expires_at',
      ], 'is_pinned DESC, published_at DESC NULLS LAST, created_at DESC', 20, true),
    );
  }

  async events(host?: string | null) {
    const resolved = await this.resolve(host);
    if (resolved.type !== 'school') {
      return this.response('Public portal events retrieved successfully', []);
    }
    return this.response(
      'Public portal events retrieved successfully',
      await this.publicRows(resolved.tenantSchema!, 'public_portal_events', [
        'id',
        'title',
        'title_bn',
        'description',
        'location',
        'start_at',
        'end_at',
        'image_url',
        'image_placeholder',
      ], 'start_at ASC', 20),
    );
  }

  private async publicRows(
    schema: string,
    table: string,
    columns: string[],
    orderBy: string,
    limit: number,
    hasExpiry = false,
  ) {
    const safeSchema = toSchemaName(schema);
    const safeTable = table.replace(/[^a-z0-9_]/gi, '');
    const select = columns
      .map((column) => {
        const safeColumn = column.replace(/[^a-z0-9_]/gi, '');
        const camel = safeColumn.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
        return `${safeColumn} AS "${camel}"`;
      })
      .join(', ');

    try {
      return await this.prisma.raw.$queryRawUnsafe<any[]>(
        `SELECT ${select}
         FROM "${safeSchema}"."${safeTable}"
         WHERE status = 'published'
           AND deleted_at IS NULL
           ${hasExpiry ? 'AND (expires_at IS NULL OR expires_at >= now())' : ''}
         ORDER BY ${orderBy}
         LIMIT ${Number(limit) || 10}`,
      );
    } catch {
      return [];
    }
  }
}
