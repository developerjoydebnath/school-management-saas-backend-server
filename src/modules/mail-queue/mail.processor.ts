import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailSettingsService } from 'src/modules/settings/mail-settings/mail-settings.service';
import { SEND_MAIL_JOB, MAIL_QUEUE } from './mail-queue.constants';
import { SendMailJob } from './dto/mail-job.dto';

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  constructor(private readonly mailSettingsService: MailSettingsService) {
    super();
  }

  async process(job: Job<SendMailJob>) {
    if (job.name !== SEND_MAIL_JOB) return null;
    if (job.data.scope === 'platform' || !job.data.schema) {
      return this.mailSettingsService.sendPlatformMail(job.data);
    }
    return this.mailSettingsService.sendTenantMail(job.data);
  }
}
