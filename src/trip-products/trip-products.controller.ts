import { Body, ConflictException, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TripProductsService } from './trip-products.service';
import { AttachTripProductDto } from './dto/attach-trip-product.dto';

@UseGuards(JwtAuthGuard)
@Controller('trips/:tripId/products')
export class TripProductsController {
  constructor(private readonly svc: TripProductsService) {}

  @Post()
  async attach(
    @Param('tripId') tripId: string,
    @Body() dto: AttachTripProductDto,
  ): Promise<void> {
    try {
      await this.svc.attach(tripId, dto);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Ya está agregado a este viaje');
      }
      throw e;
    }
  }
}
