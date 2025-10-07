import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { DeploymentProcessor } from './deployment.processor';
import { SlackProcessor } from './slack.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'preview-queue',
    }),
  ],
  providers: [QueueService, DeploymentProcessor, SlackProcessor],
  exports: [QueueService],
})
export class QueueModule {}
