import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../media/storage.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async check() {
    const checks = {
      database: await this.checkDatabase(),
      storage: await this.checkStorage(),
    };
    const ok = checks.database.ok && checks.storage.ok;
    const response = {
      ok,
      service: 'lealtad-api',
      timestamp: new Date().toISOString(),
      checks,
    };

    if (!ok) throw new ServiceUnavailableException(response);
    return response;
  }

  private async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true } as const;
    } catch {
      return { ok: false } as const;
    }
  }

  private async checkStorage() {
    try {
      return await this.storageService.healthCheck();
    } catch {
      return { ok: false } as const;
    }
  }
}
