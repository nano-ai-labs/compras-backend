import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

@Injectable()
export class GcsService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET || '';
    const keyPath = './gcs-key.json';

    if (fs.existsSync(keyPath)) {
      this.storage = new Storage({ keyFilename: keyPath });
    } else {
      this.storage = new Storage();
    }
  }

  private get bucket() {
    if (!this.bucketName) {
      throw new InternalServerErrorException('La variable de entorno GCS_BUCKET no está definida');
    }
    return this.storage.bucket(this.bucketName);
  }

  async uploadFile(file: Express.Multer.File, folderName: string) {
    try {
      const path = `${folderName}/${randomUUID()}.jpg`;
      await this.bucket.file(path).save(file.buffer, {
        contentType: file.mimetype,
        resumable: false,
      });
      return await this.getSignedUrl(path);
    } catch (error) {
      console.error('Error subiendo archivo a GCS:', error.message);
      throw new InternalServerErrorException('No se pudo subir el archivo al storage');
    }
  }

  async getSignedUrl(path: string, minutes = 60) {
    try {
      if (!path) return null;
      const [url] = await this.bucket.file(path).getSignedUrl({
        action: 'read',
        version: 'v4',
        expires: Date.now() + minutes * 60 * 1000,
      });
      return url;
    } catch (error) {
      console.error(`Error firmando URL para ${path}:`, error.message);
      return null;
    }
  }

  async delete(path: string) {
    try {
      await this.bucket.file(path).delete({ ignoreNotFound: true });
    } catch (error) {
      console.error('Error borrando archivo en GCS:', error.message);
    }
  }
}