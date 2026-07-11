import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';

interface TenantRequest extends Request {
  tenant?: string;
}

function toSchemaName(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/-/g, '_') // hyphens → underscores
    .replace(/[^a-z0-9_]/g, '') // strip anything else
    .replace(/^(\d)/, 's$1'); // can't start with a number
}

/**
 * Extracts a subdomain from a hostname string.
 * Returns null if hostname has no meaningful subdomain.
 * e.g. "sylhet_government_college.lvh.me" → "sylhet_government_college"
 *      "lvh.me" → null
 *      "www.lvh.me" → null
 */
function extractSubdomain(hostname: string): string | null {
  // Strip port if present
  const host = hostname.split(':')[0];
  const parts = host.split('.');
  if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== '') {
    return parts[0];
  }
  return null;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let tenantSchema = 'public';

    // ── Priority 1: JWT schema claim ─────────────────────────────────────────
    // If the user is already authenticated, their JWT carries the schema they
    // belong to. This is the most reliable source of truth.
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.decode(token) as { schema?: string } | null;
        if (decoded && decoded.schema) {
          tenantSchema = decoded.schema;
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Public admission portal pages may be hosted outside the tenant subdomain
    // during embedding/testing. Accept an explicit tenant hint only for that
    // unauthenticated public admission route; protected APIs still use JWT first.
    if (tenantSchema === 'public' && req.path.includes('/public/admission/')) {
      const tenantHint = req.headers['x-tenant-slug'] || req.headers['x-tenant-schema'];
      const rawTenant = Array.isArray(tenantHint) ? tenantHint[0] : tenantHint;
      if (rawTenant) {
        tenantSchema = toSchemaName(rawTenant);
      }
    }

    // ── Priority 2: Host header subdomain ────────────────────────────────────
    // When the frontend and backend share the same domain/port (e.g. proxied),
    // the Host header already contains the subdomain.
    if (tenantSchema === 'public') {
      const subdomain = extractSubdomain(req.headers.host || '');
      if (subdomain) {
        tenantSchema = toSchemaName(subdomain);
      }
    }

    // ── Priority 3: Origin header subdomain ──────────────────────────────────
    // When the frontend (e.g. port 3000) calls a separate backend (e.g. port 5000),
    // the Host header is the backend URL (no subdomain).
    // The Origin header carries the actual frontend URL — including the subdomain.
    // Example:
    //   Frontend: http://sylhet_government_college.lvh.me:3000
    //   → sends requests to: http://lvh.me:5000/api/v1/...
    //   → Host: lvh.me:5000  (no subdomain)
    //   → Origin: http://sylhet_government_college.lvh.me:3000  ← we read this
    if (tenantSchema === 'public') {
      const origin = req.headers.origin || req.headers.referer || '';
      if (origin) {
        try {
          const originUrl = new URL(origin);
          const subdomain = extractSubdomain(originUrl.hostname);
          if (subdomain) {
            tenantSchema = toSchemaName(subdomain);
          }
        } catch {
          // malformed origin — ignore
        }
      }
    }

    // Attach the detected tenant schema to the request
    (req as TenantRequest).tenant = tenantSchema;

    next();
  }
}
