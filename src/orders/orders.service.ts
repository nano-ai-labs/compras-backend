import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { buildMeta } from '../common/pagination';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateOrderDto) {
    return this.prisma.order.create({
      data: {
        tripId: dto.tripId,
        clientId: dto.clientId,
        status: dto.status ?? 'OPEN',
      },
    });
  }

  async findAll({ page = 1, limit = 20, q }: PaginationDto) {
    const skip = (page - 1) * limit;
    const search = q?.trim();

    const where: Prisma.OrderWhereInput | undefined = search
      ? {
          OR: [{ status: { contains: search, mode: Prisma.QueryMode.insensitive } }],
        }
      : undefined;

    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { client: true, trip: true, orderItems: true },
      }),
    ]);

    return { data, meta: buildMeta(page, limit, total) };
  }

  findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { client: true, trip: true, orderItems: true },
    });
  }

  update(id: string, dto: UpdateOrderDto) {
    return this.prisma.order.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: string) {
    return this.prisma.order.delete({ where: { id } });
  }
}
