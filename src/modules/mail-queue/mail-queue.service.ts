import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MAIL_QUEUE, SEND_MAIL_JOB } from './mail-queue.constants';
import { SendMailJob } from './dto/mail-job.dto';
import { MailSettingsService } from '../settings/mail-settings/mail-settings.service';

@Injectable()
export class MailQueueService {
  private readonly logger = new Logger(MailQueueService.name);

  constructor(
    @Optional()
    @InjectQueue(MAIL_QUEUE)
    private readonly queue: Queue<SendMailJob> | undefined,
    private readonly mailSettingsService: MailSettingsService,
  ) {}

  private async deliver(job: SendMailJob) {
    if (job.scope === 'platform' || !job.schema) {
      return this.mailSettingsService.sendPlatformMail(job);
    }
    return this.mailSettingsService.sendTenantMail(job);
  }

  async enqueue(job: SendMailJob) {
    if (!job.to) {
      return {
        queued: false,
        skipped: true,
        reason: 'Recipient email is missing',
      };
    }

    if (process.env.MAIL_QUEUE_ENABLED === 'false') {
      return {
        queued: false,
        skipped: true,
        reason: 'Mail queue is disabled',
      };
    }

    try {
      const transport =
        job.scope === 'platform' || !job.schema
          ? await this.mailSettingsService.resolvePlatformTransport()
          : await this.mailSettingsService.resolveTransport(job.schema);

      if (!transport) {
        return {
          queued: false,
          skipped: true,
          reason:
            job.scope === 'platform' || !job.schema
              ? 'Platform mail is not configured'
              : 'Mail is not configured',
        };
      }

      if (this.queue) {
        await this.queue.add(SEND_MAIL_JOB, job, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
          removeOnFail: { age: 60 * 60 * 24 * 7, count: 2000 },
        });
      } else {
        setImmediate(() => {
          void this.deliver(job).catch((error) => {
            this.logger.error(
              error instanceof Error ? error.message : 'Mail delivery failed',
            );
          });
        });
      }
      return { queued: true, skipped: false, reason: null };
    } catch (error) {
      return {
        queued: false,
        skipped: true,
        reason:
          error instanceof Error
            ? `Mail queue unavailable: ${error.message}`
            : 'Mail queue unavailable',
      };
    }
  }
}
