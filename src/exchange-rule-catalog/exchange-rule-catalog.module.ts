import { Module } from '@nestjs/common';
import { ExchangeRuleCatalogController } from './exchange-rule-catalog.controller';
import { ExchangeRuleCatalogService } from './exchange-rule-catalog.service';

@Module({
  controllers: [ExchangeRuleCatalogController],
  providers: [ExchangeRuleCatalogService],
})
export class ExchangeRuleCatalogModule {}