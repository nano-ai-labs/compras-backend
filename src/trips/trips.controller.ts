import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { TripsService } from './trips.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  create(@Body() dto: CreateTripDto) {
    return this.trips.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.trips.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trips.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.trips.update(id, dto);
  }

  // ✅ subir / reemplazar imagen
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    return this.trips.setImage(id, file);
  }

  // ✅ borrar imagen
  @Delete(':id/image')
  removeImage(@Param('id') id: string) {
    return this.trips.removeImage(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.trips.remove(id);
  }
}
