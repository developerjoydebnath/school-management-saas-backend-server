import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MediaService } from './media.service';

@Injectable()
export class MediaCronService {
  constructor(private mediaService: MediaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup() {
    const result = await this.mediaService.cleanupOrphanedMedia();
    console.log(`[Media Cleanup] Removed ${result.cleaned} orphaned files`);
  }
}
