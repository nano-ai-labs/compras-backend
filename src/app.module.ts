import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { TripsModule } from './trips/trips.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { ItemsModule } from './items/items.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,      // 🔑 permite usar ConfigService en todo el proyecto
      envFilePath: '.env',// 🔑 fuerza a leer .env desde la raíz
      cache: true,        // ⚡ mejora rendimiento
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    TripsModule,
    OrdersModule,
    ProductsModule,
    ItemsModule,
  ],
})
export class AppModule {}
