async getItemBreakdown(order_item_id: string) {
    const orderItem = await this.prisma.order_items.findUnique({
      where: { id: order_item_id },
      include: { product: true, order: true },
    });

    if (!orderItem) throw new Error('Order item not found.');

    const { product, base_price_usd } = orderItem;
    const exchange_rate_base = orderItem.order.exchange_rate_base;
    const exchange_rate_add = orderItem.order.exchange_rate_add;
    const shipping_cost_mxn = await this.prisma.trip_shipping_rates.findUnique({
      where: { trip_id: orderItem.order.trip_id, product_type_id: product.product_type_id },
    });

    // Cálculos
    const fees = []; // Loot fekk here if you calculat, esta parte a seguirás hacer funcional
    const subtotal_usd = base_price_usd + fees.reduce((acc, fee) => acc + (fee.amount), 0);
    const subtotal_mxn_base = subtotal_usd * exchange_rate_base;
    const subtotal_mxn_applied = subtotal_usd * (exchange_rate_base + exchange_rate_add);

    const grand_total_mxn_base = subtotal_mxn_base + shipping_cost_mxn;
    const grand_total_mxn_applied = subtotal_mxn_applied + shipping_cost_mxn;

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
            shipping_cost_mxn,
            grand_total_mxn_base,
          },
          applied: {
            subtotal_mxn_applied,
            grand_total_mxn_applied,
          },
        },
      },
    };
  }