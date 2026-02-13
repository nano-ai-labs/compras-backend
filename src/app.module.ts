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
// 🔑 IMPORTANTE: Agregar la importación del nuevo módulo
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,      
      envFilePath: '.env',
      cache: true,        
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    TripsModule,
    OrdersModule,
    ProductsModule,
    ItemsModule,
    // 🔑 IMPORTANTE: Registrarlo aquí para que las rutas /exchange-rates funcionen
    ExchangeRatesModule, 
  ],
})
export class AppModule {}
