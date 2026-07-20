import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PublicPortalService } from './public-portal.service';

function requestHost(req: Request, queryHost?: string) {
  return queryHost || req.headers['x-forwarded-host']?.toString() || req.headers.host || '';
}

@Controller('public/portal')
export class PublicPortalController {
  constructor(private readonly service: PublicPortalService) {}

  @Get('resolve')
  resolve(@Req() req: Request, @Query('host') host?: string) {
    return this.service.resolveResponse(requestHost(req, host));
  }

  @Get('config')
  config(@Req() req: Request, @Query('host') host?: string) {
    return this.service.config(requestHost(req, host));
  }

  @Get('home')
  home(@Req() req: Request, @Query('host') host?: string) {
    return this.service.home(requestHost(req, host));
  }

  @Get('pages/:slug')
  page(@Req() req: Request, @Param('slug') slug: string, @Query('host') host?: string) {
    return this.service.page(requestHost(req, host), slug);
  }

  @Get('notices')
  notices(@Req() req: Request, @Query('host') host?: string) {
    return this.service.notices(requestHost(req, host));
  }

  @Get('events')
  events(@Req() req: Request, @Query('host') host?: string) {
    return this.service.events(requestHost(req, host));
  }
}
