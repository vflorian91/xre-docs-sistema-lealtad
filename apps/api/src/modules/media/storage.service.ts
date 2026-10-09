import { GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import { mkdir, stat, writeFile } from 'fs/promises';
import { homedir } from 'os';
import path from 'path';
import { Readable } from 'stream';

export type StorageProvider = 'LOCAL' | 'S3';

@Injectable()
export class StorageService {
  private readonly configuredProvider: StorageProvider;
  private readonly s3Client?: S3Client;
  private readonly s3Bucket?: string;

  constructor(private readonly configService: ConfigService) {
    this.configuredProvider = this.configService.get<string>('MEDIA_STORAGE_PROVIDER')?.toUpperCase() === 'S3' ? 'S3' : 'LOCAL';

    if (this.configuredProvider === 'S3') {
      this.s3Bucket = this.requiredConfig('S3_BUCKET');
      const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>('S3_SECRET_ACCESS_KEY');
      this.s3Client = new S3Client({
        region: this.configService.get<string>('S3_REGION') ?? 'us-east-1',
        endpoint: this.configService.get<string>('S3_ENDPOINT') || undefined,
        forcePathStyle: this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true',
        credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
      });
    }
  }

  async put(storageKey: string, buffer: Buffer, contentType: string) {
    if (this.configuredProvider === 'S3') {
      await this.s3Client!.send(new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: contentType,
      }));
    } else {
      const fullPath = this.getFullPath(storageKey);
      await mkdir(path.dirname(fullPath), { recursive: true });
      await writeFile(fullPath, buffer);
    }

    return this.configuredProvider;
  }

  async get(storageKey: string, provider: string): Promise<Readable> {
    if (provider === 'S3') {
      if (!this.s3Client || !this.s3Bucket) {
        throw new Error('El proveedor S3 no esta configurado en esta instancia.');
      }

      try {
        const response = await this.s3Client.send(new GetObjectCommand({ Bucket: this.s3Bucket, Key: storageKey }));
        if (!response.Body) throw new NotFoundException('Archivo no encontrado en storage.');
        return response.Body as Readable;
      } catch (error) {
        if (error instanceof NotFoundException) throw error;
        const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (statusCode === 404) throw new NotFoundException('Archivo no encontrado en storage.');
        throw error;
      }
    }

    const fullPath = this.getFullPath(storageKey);
    try {
      await stat(fullPath);
    } catch {
      throw new NotFoundException('Archivo no encontrado en storage.');
    }
    return createReadStream(fullPath);
  }

  async healthCheck() {
    if (this.configuredProvider === 'S3') {
      await this.s3Client!.send(new HeadBucketCommand({ Bucket: this.s3Bucket }));
      return { provider: 'S3', ok: true } as const;
    }

    await mkdir(this.getStorageRoot(), { recursive: true });
    await stat(this.getStorageRoot());
    return { provider: 'LOCAL', ok: true } as const;
  }

  private requiredConfig(name: string) {
    const value = this.configService.get<string>(name);
    if (!value) throw new Error(`Falta configurar ${name}.`);
    return value;
  }

  private getFullPath(storageKey: string) {
    return path.join(this.getStorageRoot(), storageKey);
  }

  private getStorageRoot() {
    return this.configService.get<string>('MEDIA_STORAGE_DIR') ?? path.join(homedir(), 'sistema-lealtad-media');
  }
}
