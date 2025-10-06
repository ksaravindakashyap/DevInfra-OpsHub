import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Post('github')
  async handleGithubWebhook(@Req() req: Request, @Res() res: Response) {
    const eventType = req.headers['x-github-event'] as string;
    const signature = req.headers['x-hub-signature-256'] as string;
    
    // TODO: Verify signature with GitHub webhook secret
    // For now, we'll just store the event
    
    await this.webhooksService.storeWebhookEvent('github', eventType, req.body);
    
    res.status(200).json({ message: 'Webhook received' });
  }
}
