import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { SlackService } from '../slack/slack.service';
import { SlackNotifyJob } from './queue.service';

@Processor('preview-queue')
@Injectable()
export class SlackProcessor extends WorkerHost {
  private readonly logger = new Logger(SlackProcessor.name);

  constructor(private slackService: SlackService) {
    super();
  }

  async process(job: Job) {
    const { name, data } = job;

    if (name === 'slack-notify') {
      return this.handleSlackNotification(data as SlackNotifyJob);
    }
  }

  private async handleSlackNotification(data: SlackNotifyJob) {
    const { projectId, message, level } = data;

    try {
      await this.slackService.notifyProject(projectId, { message, level });
    } catch (error) {
      this.logger.error('Failed to send Slack notification', error);
    }
  }
}
