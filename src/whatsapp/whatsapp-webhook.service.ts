import { Injectable, Logger } from '@nestjs/common';

type WhatsappWebhookBody = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }>;
        statuses?: Array<{
          id?: string;
          status?: string;
          recipient_id?: string;
          timestamp?: string;
        }>;
      };
    }>;
  }>;
};

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  process(body: WhatsappWebhookBody): void {
    if (body.object !== 'whatsapp_business_account') {
      this.logger.warn('Webhook de WhatsApp recibido con object no esperado');
      return;
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;

        for (const message of value?.messages ?? []) {
          this.logger.log(
            `Mensaje entrante WhatsApp from=${message.from ?? 'unknown'} type=${message.type ?? 'unknown'} text=${message.text?.body ?? ''}`,
          );
        }

        for (const status of value?.statuses ?? []) {
          this.logger.log(
            `Estado WhatsApp id=${status.id ?? 'unknown'} status=${status.status ?? 'unknown'} to=${status.recipient_id ?? 'unknown'}`,
          );
        }
      }
    }
  }
}
