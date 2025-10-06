import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  async storeWebhookEvent(provider: string, eventType: string, payload: any) {
    return this.prisma.webhookEvent.create({
      data: {
        provider,
        eventType,
        payloadJson: payload,
      },
    });
  }
}
