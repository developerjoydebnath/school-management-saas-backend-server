import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageProvider } from './storage.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly basePath = path.join(process.cwd(), 'public');

  async upload(
    key: string,
    buffer: Buffer,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    contentType: string,
  ): Promise<string> {
    const filePath = path.join(this.basePath, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return `/public/${key}`; // relative path mapped to the static assets prefix
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key.replace(/^\//, ''));
    await fs.unlink(filePath).catch(() => {}); // ignore if already gone
  }
}
