import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderItemDto } from './dto/create-order-item.dto';

@Injectable()
export class OrderItemsService {
  constructor(private readonly prisma: PrismaService) {}
  
  async addItemToOrder(dto: CreateOrderItemDto) {
      // 1. Buscamos el producto para obtener su nombre (y validar que existe)
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
      });

      if (!product) {
        throw new NotFoundException(`Producto con ID ${dto.productId} no encontrado`);
      }

      // 2. Ahora creamos el ítem incluyendo el 'productName' requerido
      return await this.prisma.orderItem.create({
        data: {
          orderId: dto.orderId,
          productId: dto.productId,
          basePriceUsd: dto.base_price_usd,
          productName: product.name, // FIX: Agregamos el campo obligatorio
        },
      });
    }

  // .

  async getItemBreakdown(order_item_id: string) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: order_item_id },
      include: { product: true, order: true },
    });

    if (!orderItem) throw new NotFoundException('Order item not found.');

    // FIX TS18047: Validamos que 'product' existe antes de desestructurar
    const product = orderItem.product;
    if (!product) throw new NotFoundException('Product not found for this item.');

    const basePriceUsd = Number(orderItem.basePriceUsd);
    const exchangeRate_base = Number(orderItem.order.exchangeRateBase ?? 1);
    const exchangeRate_add = Number(orderItem.order.exchangeRateAdd ?? 0);

    // FIX TS2322: Usamos '?? undefined' porque Prisma no acepta 'null' en filtros de búsqueda
    const shippingRate = await this.prisma.tripShippingRate.findFirst({
      where: { 
        tripId: orderItem.order.tripId, 
        productTypeId: product.productTypeId ?? undefined 
      },
    });

    // FIX TS2339: TypeScript nos avisó que la propiedad se llama 'costMxn', no 'amountMxn'
    const shippingCostMxn = Number(shippingRate?.costMxn ?? 0);

    const fees: any[] = []; 
    const feesTotal = fees.reduce((acc, fee) => acc + Number(fee.amount), 0);
    
    const subtotal_usd = basePriceUsd + feesTotal;
    const subtotal_mxn_base = subtotal_usd * exchangeRate_base;
    const subtotal_mxn_applied = subtotal_usd * (exchangeRate_base + exchangeRate_add);

    return {
      breakdown: {
        USD: {
          base_price: basePriceUsd,
          fees,
          subtotal_usd,
        },
        MXN: {
          base: {
            subtotal_mxn_base,
            shippingCostMxn,
            grandTotalMxn_base: subtotal_mxn_base + shippingCostMxn,
          },
          applied: {
            subtotal_mxn_applied,
            grandTotalMxn_applied: subtotal_mxn_applied + shippingCostMxn,
          },
        },
      },
    };
  }
}