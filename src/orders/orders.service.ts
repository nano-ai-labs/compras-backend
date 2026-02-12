import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
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
        // Default correcto según tu Prisma: DRAFT
        status: dto.status ?? OrderStatus.DRAFT,
      },
    });
  }

  async findAll({ page = 1, limit = 20, q }: PaginationDto) {
    const skip = (page - 1) * limit;
    const search = q?.trim();

    // OJO: status es enum -> no puedes usar contains.
    // Si q coincide con un status válido, filtramos por ese status.
    let where: Prisma.OrderWhereInput | undefined = undefined;

    if (search) {
      const upper = search.toUpperCase();

      if (Object.values(OrderStatus).includes(upper as OrderStatus)) {
        where = { status: upper as OrderStatus };
      } else {
        // Si quieres buscar por cliente o trip por nombre, aquí puedes ampliarlo.
        // Por ahora, si no coincide con enum, no filtramos (o podrías regresar vacío).
        where = undefined;
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: true,
          trip: true,
          items: true, // <-- en tu Prisma se llama items, NO orderItems
        },
      }),
    ]);

    return { data, meta: buildMeta(page, limit, total) };
  }

  findOne(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        trip: true,
        items: true, // <-- en tu Prisma se llama items
      },
    });
  }

  update(id: string, dto: UpdateOrderDto) {
    return this.prisma.order.update({
      where: { id },
      data: {
        // si luego agregas más campos al dto, los agregas aquí
        status: dto.status,
      },
    });
  }

  remove(id: string) {
    return this.prisma.order.delete({ where: { id } });
  }
}
