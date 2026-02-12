
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
// import fs from 'fs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL no está definido en backend/.env');
    }

    /**
     * =========================
     * PRODUCCIÓN (Cloud SQL)
     * =========================
     */
    // const pool = new Pool({
    //   connectionString,
    //   ssl: {
    //     ca: fs.readFileSync('certs/server-ca.pem').toString(),
    //     rejectUnauthorized: true,
    //   },
    // });

    /**
     * =========================
     * DESARROLLO / LOCAL
     * =========================
     */
    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Prisma connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
