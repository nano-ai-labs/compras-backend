
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

@Injectable()
export class GcsService {
  private readonly logger = new Logger(GcsService.name);
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET || '';
    const keyPath = './gcs-key.json';

    // Si el archivo existe localmente lo usa, si no, usa la identidad de Google Cloud
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

  async uploadTripImage(tripId: string, file: Express.Multer.File) {
    try {
      const path = `trips/${tripId}/${randomUUID()}.jpg`;
      await this.bucket.file(path).save(file.buffer, {
        contentType: file.mimetype,
        resumable: false,
      });
      return path;
    } catch (error) {
      console.error('Error subiendo imagen a GCS:', error.message);
      throw new InternalServerErrorException('No se pudo subir la imagen al storage');
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

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    try {
      const fileName = `${randomUUID()}-${file.originalname}`;
      const path = `${folder}/${fileName}`;

      this.logger.log(
        `Subiendo archivo a GCS bucket=${this.bucketName} path=${path} size=${file.size} mime=${file.mimetype}`,
      );

      await this.bucket.file(path).save(file.buffer, {
        contentType: file.mimetype,
        resumable: false,
      });

      this.logger.log(`Archivo subido a GCS path=${path}`);
      return path;
    } catch (error: any) {
      this.logger.error(
        `Error subiendo archivo a GCS bucket=${this.bucketName} folder=${folder} message=${error?.message ?? 'unknown'}`,
        error?.stack,
      );
      throw new InternalServerErrorException('No se pudo subir el archivo');
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
