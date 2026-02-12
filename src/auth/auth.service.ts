import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

@Injectable()
export class AuthService {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  async validateUser(username: string, password: string): Promise<any> {
    // Lógica de autenticación del usuario

    // Verificar y actualizar el tipo de cambio al autenticar
    await this.exchangeRatesService.getOrUpdateTodayRate();
  }
}