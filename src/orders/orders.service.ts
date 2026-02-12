async getOrderDetails(order_id: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: order_id },
      include: { order_items: true },
    });

    if (!order) throw new Error('Order not found.');

    let totalProductsUSD = 0;
    let totalProductsMXNBase = 0;
    let totalProductsMXNApplied = 0;
    let totalShippingCost = 0;

    for (const item of order.order_items) {
      const itemDetails = await this.getItemBreakdown(item.id);
      totalProductsUSD += itemDetails.breakdown.USD.subtotal_usd;
      totalProductsMXNBase += itemDetails.breakdown.MXN.base.subtotal_mxn_base;
      totalProductsMXNApplied += itemDetails.breakdown.MXN.applied.subtotal_mxn_applied;
    }

    totalShippingCost += await this.getShippingCost(order.id);

    const grandTotalMXNBase = totalProductsMXNBase + totalShippingCost;
    const grandTotalMXNApplied = totalProductsMXNApplied + totalShippingCost;

    return {
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