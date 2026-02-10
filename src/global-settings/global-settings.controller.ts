import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { GlobalSettingsService } from './global-settings.service';
import { CreateGlobalSettingDto } from './dto/create-global-setting.dto';
import { UpdateGlobalSettingDto } from './dto/update-global-setting.dto';

@UseGuards(JwtAuthGuard)
@Controller('global-settings')
export class GlobalSettingsController {
  constructor(private readonly gs: GlobalSettingsService) {}

  @Post()
  create(@Body() dto: CreateGlobalSettingDto) {
    return this.gs.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.gs.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gs.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGlobalSettingDto) {
    return this.gs.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gs.remove(Number(id));
  }
}
