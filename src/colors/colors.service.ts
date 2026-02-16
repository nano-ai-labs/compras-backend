import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ColorsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, limit = 10) {
    const query = (q ?? '').trim();
    if (query.length < 3) return [];

    const take = Math.min(Math.max(1, limit || 10), 30);

    const items = await this.prisma.color.findMany({
      where: {
        enabled: true,
        name: { contains: query, mode: 'insensitive' },
      },
      take,
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });

    return items;
  }
}
