import { Module } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRatesController } from './exchange-rates.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExchangeRatesController], // 👈 Revisa que esté aquí
  providers: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
