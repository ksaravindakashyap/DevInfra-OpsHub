import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { DeploymentProcessor } from './deployment.processor';
import { SlackProcessor } from './slack.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { ProviderService } from '../providers/provider.service';
import { SlackService } from '../slack/slack.service';
import { AuditModule } from '../audit/audit.module';
import { EnvVarsService } from '../environments/env-vars.service';
import { CryptoModule } from '../crypto/crypto.module';
import { HealthProbeService } from '../health/health-probe.service';
import { HealthService } from '../health/health.service';
import { DeployEventsService } from '../analytics/deploy-events.service';

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
    PrismaModule,
    AuditModule,
    CryptoModule,
  ],
  providers: [
    QueueService,
    DeploymentProcessor,
    SlackProcessor,
    ProviderService,
    SlackService,
    EnvVarsService,
    HealthProbeService,
    HealthService,
    DeployEventsService,
  ],
  exports: [QueueService],
})
export class QueueModule {}
