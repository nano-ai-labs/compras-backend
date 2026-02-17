import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ClientsService', () => {
  let service: ClientsService;
  const prisma = {
    client: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  it('findByPhone normaliza y busca por phoneNormalized', async () => {
    prisma.client.findFirst.mockResolvedValueOnce(null);

    await service.findByPhone('(55) 1234-5678');

    expect(prisma.client.findFirst).toHaveBeenCalledWith({
      where: { phoneNormalized: '5512345678' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('findByPhone lanza 400 para phone inválido', async () => {
    await expect(service.findByPhone('---')).rejects.toBeInstanceOf(BadRequestException);
  });
});
