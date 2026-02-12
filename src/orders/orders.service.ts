import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una nueva orden vinculada a un viaje y un cliente
   */
  async create(dto: CreateOrderDto) {
    try {
      return await this.prisma.order.create({
        data: {
          tripId: dto.tripId,
          clientId: dto.clientId,
          status: 'DRAFT',
        },
      });
    } catch (error) {
      // Manejo de error si ya existe la combinación única tripId-clientId
      if (error.code === 'P2002') {
        throw new BadRequestException('Ya existe una orden para este cliente en este viaje.');
      }
      throw error;
    }
  }

  /**
   * Busca todas las órdenes (puedes añadir filtros aquí después)
   */
  async findAll() {
    return this.prisma.order.findMany({
      include: { trip: true, client: true },
    });
  }

  /**
   * Busca una orden por ID básica
   */
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { trip: true, client: true, items: true },
    });

    if (!order) throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    return order;
  }

  /**
   * Lógica compleja de desglose y cálculos financieros
   */
  async getOrderDetails(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        items: {
          include: { product: true } // Asumiendo que OrderItem tiene relación con Product
        } 
      },
    });

    if (!order) throw new NotFoundException('Order not found.');

    let totalProductsUSD = 0;
    let totalProductsMXNBase = 0;
    let totalProductsMXNApplied = 0;

    // Usamos 'items' que es el nombre real en tu schema.prisma
    for (const item of order.items) {
      const itemDetails = await this.getItemBreakdown(item.id);
      totalProductsUSD += itemDetails.breakdown.USD.subtotal_usd;
      totalProductsMXNBase += itemDetails.breakdown.MXN.base.subtotal_mxn_base;
      totalProductsMXNApplied += itemDetails.breakdown.MXN.applied.subtotal_mxn_applied;
    }

    const totalShippingCost = await this.getShippingCost(order.id);

    const grandTotalMXNBase = totalProductsMXNBase + totalShippingCost;
    const grandTotalMXNApplied = totalProductsMXNApplied + totalShippingCost;

    return {
      orderId: order.id,
      status: order.status,
      exchangeRate: {
        base: order.exchangeRateBase,
        additional: order.exchangeRateAdd,
      },
      totalProducts: {
        cost_usd: totalProductsUSD,
        cost_mxn_base: totalProductsMXNBase,
        cost_mxn_applied: totalProductsMXNApplied,
      },
      totalShipping: totalShippingCost,
      grandTotal: {
        base: grandTotalMXNBase,
        applied: grandTotalMXNApplied,
      },
    };
  }

  /**
   * Actualiza el estado o datos de la orden
   */
  async update(id: string, dto: UpdateOrderDto) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Elimina una orden
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.order.delete({ where: { id } });
  }

  // --- MÉTODOS PRIVADOS PARA CÁLCULOS ---

  private async getItemBreakdown(itemId: string) {
    // Aquí implementas la lógica de conversión de moneda por item
    // Por ahora retorno una estructura base para que no falle tu loop
    return {
      breakdown: {
        USD: { subtotal_usd: 0 },
        MXN: { 
          base: { subtotal_mxn_base: 0 },
          applied: { subtotal_mxn_applied: 0 }
        }
      }
    };
  }

  private async getShippingCost(orderId: string) {
    // Lógica para obtener costos de envío vinculados a la orden
    return 0;
  }
}