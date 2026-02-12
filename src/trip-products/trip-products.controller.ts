import { Controller, Post, Body, Param } from '@nestjs/common';
import { TripProductsService } from './trip-products.service';
import { CreateTripProductDto } from './dto/create-trip-product.dto';

@Controller('trip-products')
export class TripProductsController {
  constructor(private readonly tripProductsService: TripProductsService) {}

ß
}