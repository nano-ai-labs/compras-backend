import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';

@Injectable()
export class GcsService {
  private storage = new Storage();
  private bucket = this.storage.bucket(process.env.GCS_BUCKET!);

  async uploadTripImage(tripId: string, file: Express.Multer.File) {
    const path = `trips/${tripId}/${randomUUID()}.jpg`;
    await this.bucket.file(path).save(file.buffer, {
      contentType: file.mimetype,
      resumable: false,
    });
    return path;
  }

  async getSignedUrl(path: string, minutes = 60) {
    const [url] = await this.bucket.file(path).getSignedUrl({
      action: 'read',
      expires: Date.now() + minutes * 60 * 1000,
    });
    return url;
  }

  async delete(path: string) {
    await this.bucket.file(path).delete({ ignoreNotFound: true });
  }
}
