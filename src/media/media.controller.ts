import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { Request } from 'express';

@Controller('uploads')
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('module') module: string,
    @Body('entityType') entityType: string,
    @Body('entityId') entityId: string,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP allowed');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File too large. Max 5MB.');
    }

    return this.mediaService.processUpload(
      file.buffer,
      file.originalname,
      module,
      req.tenantSchema ?? null,
      req.user?.id,
      entityType,
      entityId,
    );
  }

  @Delete('image/:mediaId')
  async deleteImage(@Param('mediaId') mediaId: string) {
    await this.mediaService.decrementReference(mediaId);
    return { success: true };
  }
}
