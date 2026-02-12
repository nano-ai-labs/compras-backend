export class OrderItemsService {
    constructor(private readonly prisma: PrismaService) {}

    constructor(private readonly prisma: PrismaService) {}

async getItemBreakdown(order_item_id: string) {
    const orderItem = await this.prisma.order_items.findUnique({
      where: { id: order_item_id },
      include: { product: true, order: true },
    });

    if (!orderItem) throw new Error('Order item not found.');

    const { product, base_price_usd } = orderItem;
    const exchangeRate_base = orderItem.order.exchangeRate_base;
    const exchangeRate_add = orderItem.order.exchangeRate_add;
    const shippingCostMxn = await this.prisma.trip_shipping_rates.findUnique({
      where: { tripId: orderItem.order.tripId, product_type_id: product.product_type_id },
    });

    // Cálculos
    const fees = []; // Loot fekk here if you calculat, esta parte a seguirás hacer funcional
    const subtotal_usd = base_price_usd + fees.reduce((acc: number, fee: any) => acc + Number(fee.amount), 0);(acc, fee) => acc + (fee.amount), 0);
    const subtotal_mxn_base = subtotal_usd * exchangeRate_base;
    const subtotal_mxn_applied = subtotal_usd * (exchangeRate_base + exchangeRate_add);

    const grandTotalMxn_base = subtotal_mxn_base + shippingCostMxn;
    const grandTotalMxn_applied = subtotal_mxn_applied + shippingCostMxn;

    return {
      breakdown: {
        USD: {
          base_price: base_price_usd,
          fees,
          subtotal_usd,
        },
        MXN: {
          base: {
            subtotal_mxn_base,
            shippingCostMxn,
            grandTotalMxn_base,
          },
          applied: {
            subtotal_mxn_applied,
            grandTotalMxn_applied,
          },
        },
}
    };
  }