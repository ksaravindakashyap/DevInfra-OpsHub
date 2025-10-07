import { Controller, Post, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';
import { GithubWebhookService } from './github-webhook.service';
import * as crypto from 'crypto';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private webhooksService: WebhooksService,
    private githubWebhookService: GithubWebhookService,
  ) {}

  @Post('github')
  async handleGithubWebhook(@Req() req: Request, @Res() res: Response) {
    const eventType = req.headers['x-github-event'] as string;
    const signature = req.headers['x-hub-signature-256'] as string;
    
    // Verify signature if secret is configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret) {
      const isValid = this.verifyGithubSignature(req.body, signature, webhookSecret);
      if (!isValid) {
        this.logger.warn('Invalid GitHub webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else {
      this.logger.warn('GITHUB_WEBHOOK_SECRET not configured - accepting webhook without verification');
    }
    
    // Store the webhook event
    await this.webhooksService.storeWebhookEvent('github', eventType, req.body);
    
    // Process the webhook if it's a pull request event
    if (eventType === 'pull_request') {
      await this.githubWebhookService.processPullRequestEvent(req.body);
    }
    
    res.status(200).json({ message: 'Webhook received' });
  }

  private verifyGithubSignature(payload: any, signature: string, secret: string): boolean {
    if (!signature) return false;
    
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
