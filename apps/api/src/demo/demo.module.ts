import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WebhookModule } from '../webhook/webhook.module';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [PrismaModule, WebhookModule, HealthModule],
  controllers: [DemoController],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
