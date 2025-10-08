import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DeployAnalyticsService } from './deploy-analytics.service';
import { SlackService } from '../slack/slack.service';

@Controller('projects/:projectId/metrics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(
    private deployAnalyticsService: DeployAnalyticsService,
    private slackService: SlackService,
  ) {}

  @Get('deploy')
  async getDeployMetrics(
    @Param('projectId') projectId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('bucket') bucket?: 'day',
    @CurrentUser() user: any,
  ) {
    // Default to last 14 days if no dates provided
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    return this.deployAnalyticsService.getDeployMetrics(
      projectId,
      fromDate,
      toDate,
      bucket || 'day'
    );
  }

  @Post('deploy/weekly-digest')
  async sendWeeklyDigest(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    const digest = await this.deployAnalyticsService.getWeeklyDigest(projectId);
    
    const message = `:bar_chart: Weekly Deploy Analytics (Project ${projectId})
• Success rate: ${(digest.successRate * 100).toFixed(1)}%  • Attempts: ${digest.attempts}
• P95 create time: ${(digest.p95CreateMs / 1000).toFixed(1)}s  (P50: ${(digest.p50CreateMs / 1000).toFixed(1)}s)
• Top errors: ${digest.topErrors.map(e => `${e.reason}(${e.count})`).join(', ')}`;

    await this.slackService.notifyProject(projectId, {
      message,
      level: 'info',
    });

    return { success: true, message: 'Weekly digest sent' };
  }
}
