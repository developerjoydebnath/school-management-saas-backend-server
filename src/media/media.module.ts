import { Module } from '@nestjs/common';
import { PrismaService } from '../cores/prisma.service';
import { MediaController } from './media.controller';
import { MediaCronService } from './media.cron';
import { MediaService } from './media.service';
import { LocalStorageProvider } from './storage/local-storage.provider';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    MediaCronService,
    LocalStorageProvider,
    PrismaService,
  ],
  exports: [MediaService],
})
export class MediaModule {}
