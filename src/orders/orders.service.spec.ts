import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../storage/gcs.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const prisma = {
    trip: {
      findUnique: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
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
});
