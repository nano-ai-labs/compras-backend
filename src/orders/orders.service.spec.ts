import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../storage/gcs.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const prisma = {
    $transaction: jest.fn(),
    trip: {
      findUnique: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
    },
    tripProductFee: {
      findMany: jest.fn(),
    },
    tripExchangeRule: {
      findMany: jest.fn(),
    },
    tripShippingRate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    exchangeRate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    tripProduct: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    orderItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    orderItemProductFee: {
      create: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const gcs = {
    getSignedUrl: jest.fn().mockResolvedValue('https://signed.test/image.jpg'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: GcsService, useValue: gcs },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);

    prisma.tripProductFee.findMany.mockResolvedValue([]);
    prisma.tripExchangeRule.findMany.mockResolvedValue([]);
    prisma.tripShippingRate.findMany.mockResolvedValue([]);
    prisma.exchangeRate.findMany.mockResolvedValue([]);
    prisma.exchangeRate.findFirst.mockResolvedValue({ rateMxn: new Prisma.Decimal(17.5) });
  });

  it('create devuelve 409 si ya existe orden tripId-clientId', async () => {
    prisma.trip.findUnique.mockResolvedValueOnce({ id: 'trip-1' });
    prisma.client.findUnique.mockResolvedValueOnce({ id: 'client-1' });
    prisma.order.create.mockRejectedValueOnce({ code: 'P2002' });

    await expect(
      service.create({ tripId: '11111111-1111-1111-1111-111111111111', clientId: '22222222-2222-2222-2222-222222222222' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('findByPhoneInTrip regresa existsInTrip=false cuando no hay orden', async () => {
    prisma.order.findFirst.mockResolvedValueOnce(null);

    const result = await service.findByPhoneInTrip('trip-1', '(55) 1234-5678');

    expect(result).toEqual({
      existsInTrip: false,
      client: null,
      orderId: null,
    });
  });

  it('findByPhoneInTrip regresa existsInTrip=true cuando sí hay orden', async () => {
    prisma.order.findFirst.mockResolvedValueOnce({
      id: 'order-1',
      client: { id: 'client-1', name: 'Juan', phone: '5512345678' },
    });

    const result = await service.findByPhoneInTrip('trip-1', '55 1234 5678');

    expect(result).toEqual({
      existsInTrip: true,
      client: { id: 'client-1', name: 'Juan', phone: '5512345678' },
      orderId: 'order-1',
    });
  });

  it('findAll pagina por tripId con meta', async () => {
    prisma.order.count.mockResolvedValueOnce(1);
    prisma.order.findMany.mockResolvedValueOnce([
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        tripId: 'trip-1',
        clientId: 'client-1',
        status: 'DRAFT',
        grandTotalMxn: new Prisma.Decimal(0),
        exchangeRateBase: new Prisma.Decimal(17.5),
        exchangeRateAdd: new Prisma.Decimal(0.6),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        client: { id: 'client-1', name: 'Juan', phone: '5512345678' },
        items: [],
      },
    ]);

    const res = await service.findAll({
      tripId: '11111111-1111-1111-1111-111111111111',
      page: 1,
      limit: 20,
      q: undefined,
    });

    expect(res.meta.page).toBe(1);
    expect(res.meta.limit).toBe(20);
    expect(res.meta.total).toBe(1);
    expect(res.data).toHaveLength(1);
  });

  it('getAvailableProducts excluye tripProducts ya relacionados al pedido', async () => {
    prisma.order.findUnique.mockResolvedValueOnce({ id: 'order-1', tripId: 'trip-1' });
    prisma.orderItem.findMany.mockResolvedValueOnce([
      { tripProductId: 'tp-1', productId: 'prod-1' },
    ]);
    prisma.tripProduct.count.mockResolvedValueOnce(0);
    prisma.tripProduct.findMany.mockResolvedValueOnce([]);

    await service.getAvailableProducts('order-1', { tripId: 'trip-1', page: 1, limit: 20 });

    expect(prisma.tripProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { notIn: ['tp-1'] },
          productId: { notIn: ['prod-1'] },
        }),
      }),
    );
  });

  it('addItem regresa conflicto si tripProduct ya está en el pedido', async () => {
    prisma.order.findUnique.mockResolvedValueOnce({ id: 'order-1', tripId: 'trip-1' });
    prisma.tripProduct.findUnique.mockResolvedValueOnce({
      id: 'tp-1',
      tripId: 'trip-1',
      productId: 'prod-1',
      basePriceUsd: new Prisma.Decimal(50),
      product: {
        id: 'prod-1',
        name: 'Producto',
        stock: 10,
        defaultPriceUsd: new Prisma.Decimal(50),
        productTypeId: 'pt-1',
        productType: { name: 'Tipo' },
      },
    });
    prisma.orderItem.findFirst.mockResolvedValueOnce({ id: 'existing' });

    await expect(service.addItem('order-1', { tripProductId: 'tp-1', quantity: 1 }))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('addItem agrega item y recalcula grandTotalMxn', async () => {
    prisma.order.findUnique
      .mockResolvedValueOnce({ id: 'order-1', tripId: 'trip-1' }) // addItem
      .mockResolvedValueOnce(null); // exchange fallback not used here

    prisma.tripProduct.findUnique.mockResolvedValueOnce({
      id: 'tp-1',
      tripId: 'trip-1',
      productId: 'prod-1',
      basePriceUsd: new Prisma.Decimal(50),
      product: {
        id: 'prod-1',
        name: 'Producto',
        stock: 10,
        defaultPriceUsd: new Prisma.Decimal(50),
        productTypeId: 'pt-1',
        productType: { name: 'Tipo' },
      },
    });
    prisma.orderItem.findFirst.mockResolvedValueOnce(null);
    prisma.tripShippingRate.findUnique.mockResolvedValueOnce({
      costMxn: new Prisma.Decimal(80),
      enabled: true,
      nameSnapshot: 'Envio',
    });
    prisma.tripProductFee.findMany.mockResolvedValueOnce([
      { id: 'fee-1', nameSnapshot: 'Tax', percentage: new Prisma.Decimal(6) },
    ]);
    prisma.$transaction.mockImplementationOnce(async (cb: any) =>
      cb({
        orderItem: { create: jest.fn().mockResolvedValue({ id: 'oi-1' }) },
        orderItemProductFee: { create: jest.fn().mockResolvedValue({}) },
        product: { update: jest.fn().mockResolvedValue({}) },
      }),
    );

    prisma.order.findFirst.mockResolvedValueOnce({
      id: 'order-1',
      tripId: 'trip-1',
      clientId: 'client-1',
      status: 'DRAFT',
      grandTotalMxn: new Prisma.Decimal(0),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      client: { id: 'client-1', name: 'Juan', phone: '5512345678' },
      items: [
        {
          id: 'oi-1',
          orderId: 'order-1',
          tripProductId: 'tp-1',
          productId: 'prod-1',
          quantity: 1,
          productName: 'Producto',
          basePriceUsd: new Prisma.Decimal(50),
          productTypeId: 'pt-1',
          shippingCostMxn: new Prisma.Decimal(80),
          finalPriceMxn: new Prisma.Decimal(0),
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          appliedProductFees: [],
          product: { id: 'prod-1', name: 'Producto', images: [] },
        },
      ],
    });
    prisma.order.update.mockResolvedValueOnce({});

    const result = await service.addItem('order-1', { tripProductId: 'tp-1', quantity: 1 });

    expect(result.itemId).toBe('oi-1');
    expect(prisma.order.update).toHaveBeenCalled();
  });
});
