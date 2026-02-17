import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExchangeRatesService {
  constructor(private readonly prisma: PrismaService) {}

  private getTodayUtcDate() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }

  private toNumber(v: Prisma.Decimal | number): number {
    if (typeof v === 'number') return v;
    return v.toNumber();
  }

  // GET /exchange-rates/today
  async getTodayFromDb() {
    const today = this.getTodayUtcDate();

    const current = await this.prisma.exchangeRate.findUnique({
      where: { date: today },
    });

    if (current && this.toNumber(current.rateMxn) > 0) {
      return {
        ok: true,
        usd_mxn: this.toNumber(current.rateMxn),
        source: 'db',
        updatedAt: current.updatedAt.toISOString(),
      };
    }

    // Fallback: última tasa válida en histórico
    const latest = await this.prisma.exchangeRate.findFirst({
      where: { rateMxn: { gt: new Prisma.Decimal(0) } },
      orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
    });

    if (!latest) {
      throw new NotFoundException({
        ok: false,
        error: 'FX_RATE_NOT_AVAILABLE',
      });
    }

    return {
      ok: true,
      usd_mxn: this.toNumber(latest.rateMxn),
      source: 'fallback',
      updatedAt: latest.updatedAt.toISOString(),
    };
  }

  // POST /exchange-rates/sync
  async saveRate(rawRate: number | string) {
    const rate = Number(rawRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new BadRequestException({
        ok: false,
        error: 'INVALID_RATE',
      });
    }

    const today = this.getTodayUtcDate();
    const saved = await this.prisma.exchangeRate.upsert({
      where: { date: today },
      update: {
        rateMxn: new Prisma.Decimal(rate),
        source: 'frontend_sync',
      },
      create: {
        date: today,
        rateMxn: new Prisma.Decimal(rate),
        source: 'frontend_sync',
      },
    });

    return {
      ok: true,
      usd_mxn: this.toNumber(saved.rateMxn),
      source: 'db',
      updatedAt: saved.updatedAt.toISOString(),
    };
  }
}
