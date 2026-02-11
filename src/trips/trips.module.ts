import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../storage/gcs.service';

@Module({
  controllers: [TripsController],
  providers: [TripsService, PrismaService, GcsService],
})
export class TripsModule {}
