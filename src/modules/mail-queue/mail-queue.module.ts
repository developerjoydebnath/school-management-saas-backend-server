import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailSettingsModule } from 'src/modules/settings/mail-settings/mail-settings.module';
import { MAIL_QUEUE } from './mail-queue.constants';
import { MailProcessor } from './mail.processor';
import { MailQueueService } from './mail-queue.service';

const useBullMq =
  process.env.MAIL_QUEUE_ENABLED !== 'false' &&
  (process.env.MAIL_QUEUE_DRIVER === 'bullmq' ||
    process.env.MAIL_QUEUE_ENABLED === 'true' ||
    !!process.env.REDIS_HOST ||
    !!process.env.QUEUE_REDIS_HOST ||
    !!process.env.REDIS_URL);

const redisConnection = process.env.REDIS_URL
  ? ({ url: process.env.REDIS_URL } as any)
  : {
      host:
        process.env.REDIS_HOST || process.env.QUEUE_REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT || process.env.QUEUE_REDIS_PORT || 6379),
    };

@Module({
  imports: [
    ...(useBullMq
      ? [
          BullModule.forRoot({
            connection: redisConnection,
          }),
          BullModule.registerQueue({ name: MAIL_QUEUE }),
        ]
      : []),
    MailSettingsModule,
  ],
  providers: [MailQueueService, ...(useBullMq ? [MailProcessor] : [])],
  exports: [MailQueueService],
})
export class MailQueueModule {}
