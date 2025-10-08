import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { DeployAnalyticsService } from './deploy-analytics.service';
import { DeployEventsService } from './deploy-events.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SlackModule } from '../slack/slack.module';

@Module({
  imports: [PrismaModule, SlackModule],
  providers: [DeployAnalyticsService, DeployEventsService],
  controllers: [AnalyticsController],
  exports: [DeployAnalyticsService, DeployEventsService],
})
export class AnalyticsModule {}
