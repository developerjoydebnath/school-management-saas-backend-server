import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import sharp from 'sharp';
import { PrismaService } from '../cores/prisma.service';
import { LocalStorageProvider } from './storage/local-storage.provider';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private storage: LocalStorageProvider,
  ) {}

  async processUpload(
    buffer: Buffer,
    originalName: string,
    module: string,
    schemaName: string | null,
    uploadedBy: string,
    entityType?: string,
    entityId?: string,
  ) {
    // Step 1 — hash BEFORE any processing
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Step 2 — dedup check
    const existing = await this.prisma.media.findUnique({
      where: { fileHash },
    });

    if (existing && !existing.isDeleted) {
      await this.prisma.media.update({
        where: { id: existing.id },
        data: { referenceCount: { increment: 1 } },
      });
      return {
        url: existing.path,
        placeholder: existing.placeholder,
        mediaId: existing.id,
        deduplicated: true,
      };
    }

    // Step 3 — validate it's really an image
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new BadRequestException('Invalid image file');
    }

    // Step 4 — main optimized version
    const optimizedBuffer = await sharp(buffer)
      .rotate() // auto-orient + strips EXIF/GPS data
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // Step 5 — thumbnail variant
    const thumbnailBuffer = await sharp(buffer)
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 70 })
      .toBuffer();

    // Step 6 — medium variant
    const mediumBuffer = await sharp(buffer)
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    // Step 7 — blur placeholder (tiny, inline base64)
    const placeholderBuffer = await sharp(buffer)
      .resize(20, 20, { fit: 'inside' })
      .blur(2)
      .webp({ quality: 40 })
      .toBuffer();
    const placeholder = `data:image/webp;base64,${placeholderBuffer.toString('base64')}`;

    // Step 8 — save all variants to local storage
    const baseFileName = crypto.randomUUID();
    const folder = `uploads/${module}/${schemaName || 'global'}`;

    const [mainPath, thumbPath, medPath] = await Promise.all([
      this.storage.upload(
        `${folder}/${baseFileName}.webp`,
        optimizedBuffer,
        'image/webp',
      ),
      this.storage.upload(
        `${folder}/${baseFileName}-thumb.webp`,
        thumbnailBuffer,
        'image/webp',
      ),
      this.storage.upload(
        `${folder}/${baseFileName}-med.webp`,
        mediumBuffer,
        'image/webp',
      ),
    ]);

    // Step 9 — create Media record
    const media = await this.prisma.media.create({
      data: {
        fileName: `${baseFileName}.webp`,
        originalName,
        path: mainPath,
        thumbnailPath: thumbPath,
        mediumPath: medPath,
        placeholder,
        mimeType: 'image/webp',
        fileSize: optimizedBuffer.length,
        width: metadata.width,
        height: metadata.height,
        fileHash,
        schemaName,
        uploadedBy,
        module,
        entityType,
        entityId,
      },
    });

    return {
      url: media.path,
      placeholder: media.placeholder,
      mediaId: media.id,
      deduplicated: false,
    };
  }

  // Called when an image is removed/replaced on an entity
  async decrementReference(mediaId: string) {
    await this.prisma.media.update({
      where: { id: mediaId },
      data: { referenceCount: { decrement: 1 } },
    });
  }

  // Called by the daily cron job
  async cleanupOrphanedMedia() {
    const orphaned = await this.prisma.media.findMany({
      where: { referenceCount: { lte: 0 }, isDeleted: false },
    });

    for (const media of orphaned) {
      await this.storage.delete(media.path);
      if (media.thumbnailPath) await this.storage.delete(media.thumbnailPath);
      if (media.mediumPath) await this.storage.delete(media.mediumPath);

      await this.prisma.media.update({
        where: { id: media.id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    }

    return { cleaned: orphaned.length };
  }
}
