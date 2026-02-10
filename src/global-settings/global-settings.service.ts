import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildMeta } from '../common/pagination';
import { CreateGlobalSettingDto } from './dto/create-global-setting.dto';
import { UpdateGlobalSettingDto } from './dto/update-global-setting.dto';

@Injectable()
export class GlobalSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateGlobalSettingDto) {
    return this.prisma.globalSetting.create({
      data: {
        dollarExchangeRate: dto.dollarExchangeRate,
        currencySpread: dto.currencySpread ?? undefined,
        commissionPct: dto.commissionPct ?? undefined,
        importTaxPct: dto.importTaxPct ?? undefined,
        salesTaxPct: dto.salesTaxPct ?? undefined,
        // updatedAt lo maneja la DB/default; no lo mandamos aquí
      },
    });
  }

  async findAll({ page = 1, limit = 20 }: PaginationDto) {
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.globalSetting.count(),
      this.prisma.globalSetting.findMany({
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return { data, meta: buildMeta(page, limit, total) };
  }

  findOne(id: number) {
    return this.prisma.globalSetting.findUnique({
      where: { id },
    });
  }

  update(id: number, dto: UpdateGlobalSettingDto) {
    return this.prisma.globalSetting.update({
      where: { id },
      data: {
        dollarExchangeRate: dto.dollarExchangeRate ?? undefined,
        currencySpread: dto.currencySpread ?? undefined,
        commissionPct: dto.commissionPct ?? undefined,
        importTaxPct: dto.importTaxPct ?? undefined,
        salesTaxPct: dto.salesTaxPct ?? undefined,
        updatedAt: new Date(),
      },
    });
  }

  remove(id: number) {
    return this.prisma.globalSetting.delete({
      where: { id },
    });
  }
}
