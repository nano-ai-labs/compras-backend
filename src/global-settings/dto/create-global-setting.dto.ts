import { IsNumberString, IsOptional } from 'class-validator';

export class CreateGlobalSettingDto {
  @IsNumberString()
  public dollarExchangeRate: string;

  @IsOptional() @IsNumberString()
  currencySpread?: string;

  @IsOptional() @IsNumberString()
  commissionPct?: string;

  @IsOptional() @IsNumberString()
  importTaxPct?: string;

  @IsOptional() @IsNumberString()
  salesTaxPct?: string;
}
