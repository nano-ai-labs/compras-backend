import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TripProductsService } from './trip-products.service';
import { AttachTripProductDto } from './dto/attach-trip-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UpdateTripProductDto } from './dto/update-trip-product.dto';

@UseGuards(JwtAuthGuard)
@Controller('trips/:tripId/products')
export class TripProductsController {
  constructor(private readonly svc: TripProductsService) {}

  @Get()
  async findByTrip(
    @Param('tripId') tripId: string,
    @Query() query: PaginationDto,
  ) {
    return this.svc.findByTrip(tripId, query.page ?? 1, query.limit ?? 20);
  }

  @Post()
  async attach(
    @Param('tripId') tripId: string,
    @Body() dto: AttachTripProductDto,
  ) {
    try {
      return await this.svc.attach(tripId, dto);
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('Ya está agregado a este viaje');
      }
      throw e;
    }
  }

  @Patch(':tripProductId')
  async update(
    @Param('tripId') tripId: string,
    @Param('tripProductId') tripProductId: string,
    @Body() dto: UpdateTripProductDto,
  ) {
    return this.svc.update(tripId, tripProductId, dto);
  }

  @Delete(':tripProductId')
  async remove(
    @Param('tripId') tripId: string,
    @Param('tripProductId') tripProductId: string,
  ) {
    return this.svc.remove(tripId, tripProductId);
  }
}
