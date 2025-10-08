import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { HealthProbeService } from './health-probe.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { SlackModule } from '../slack/slack.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, AuditModule, SlackModule, QueueModule],
  providers: [HealthService, HealthProbeService],
  controllers: [HealthController],
  exports: [HealthService, HealthProbeService],
})
export class HealthModule {}
