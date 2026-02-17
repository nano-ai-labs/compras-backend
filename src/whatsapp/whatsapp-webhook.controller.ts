import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { WhatsappWebhookService } from './whatsapp-webhook.service';

@Controller('webhooks/whatsapp')
export class WhatsappWebhookController {
  constructor(
    private readonly configService: ConfigService,
    private readonly whatsappWebhookService: WhatsappWebhookService,
  ) {}

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const expectedVerifyToken =
      this.configService.get<string>('WHATSAPP_VERIFY_TOKEN') ?? '';

    if (
      mode === 'subscribe' &&
      expectedVerifyToken.length > 0 &&
      verifyToken === expectedVerifyToken
    ) {
      return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
  }

  @Post()
  @HttpCode(200)
  receiveWebhook(@Body() body: any) {
    this.whatsappWebhookService.process(body);
    return 'EVENT_RECEIVED';
  }
}
