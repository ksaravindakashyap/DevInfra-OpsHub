import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrgsModule } from './orgs/orgs.module';
import { ProjectsModule } from './projects/projects.module';
import { AuditModule } from './audit/audit.module';
import { PrismaModule } from './prisma/prisma.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { QueueModule } from './queue/queue.module';
import { SlackModule } from './slack/slack.module';
import { EnvironmentsModule } from './environments/environments.module';
import { CryptoModule } from './crypto/crypto.module';
import { HealthModule } from './health/health.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { TestModule } from './test/test.module';
import { ProvidersModule } from './providers/providers.module';
import { DemoModule } from './demo/demo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrgsModule,
    ProjectsModule,
    AuditModule,
    WebhooksModule,
    QueueModule,
    SlackModule,
    EnvironmentsModule,
    CryptoModule,
    HealthModule,
    AnalyticsModule,
    TestModule,
    ProvidersModule,
    DemoModule,
  ],
})
export class AppModule {}
