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

    // ✅ DETECCIÓN INTELIGENTE DE ENTORNO
    // Si el archivo JSON existe (Local), úsalo. Si no (Nube), usa la identidad de Cloud Run.
    if (fs.existsSync(keyPath)) {
      this.storage = new Storage({ keyFilename: keyPath });
    } else {
      this.storage = new Storage();
    }
  }

  private get bucket() {
    if (!this.bucketName) {
      throw new InternalServerErrorException('GCS_BUCKET no está definido en las variables de entorno');
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
      throw new InternalServerErrorException('No se pudo subir la imagen');
    }
  }

  async getSignedUrl(path: string, minutes = 60) {
    try {
      if (!path) return null;
      
      const [url] = await this.bucket.file(path).getSignedUrl({
        action: 'read',
        version: 'v4', // Recomendado para Cloud Run
        expires: Date.now() + minutes * 60 * 1000,
      });
      return url;
    } catch (error) {
      // ✅ CRUCIAL: Si falla la firma (archivo borrado o permisos), 
      // regresamos null en lugar de romper todo el listado de viajes.
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