import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SlackNotification {
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(private prisma: PrismaService) {}

  async notifyProject(projectId: string, notification: SlackNotification) {
    // Skip Slack notifications in test mode
    if (process.env.DISABLE_SLACK === '1') {
      this.logger.log(`[TEST] Slack notification skipped for project ${projectId}: ${notification.message}`);
      return;
    }

    try {
      // Find Slack notification channel for this project
      const channel = await this.prisma.notificationChannel.findFirst({
        where: {
          projectId,
          type: 'SLACK',
        },
      });

      if (!channel?.slackBotToken || !channel?.slackChannel) {
        this.logger.warn(`No Slack configuration found for project ${projectId}`);
        return;
      }

      // Format message with emoji based on level
      const emoji = this.getEmojiForLevel(notification.level);
      const message = `${emoji} ${notification.message}`;

      // Send to Slack
      await this.sendSlackMessage(channel.slackBotToken, channel.slackChannel, message);

      this.logger.log(`Sent Slack notification for project ${projectId}: ${notification.message}`);
    } catch (error) {
      this.logger.error(`Failed to send Slack notification for project ${projectId}`, error);
    }
  }

  private async sendSlackMessage(botToken: string, channel: string, message: string) {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        text: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Slack API error: ${error}`);
    }

    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error}`);
    }
  }

  private getEmojiForLevel(level: string): string {
    switch (level) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  }
}
