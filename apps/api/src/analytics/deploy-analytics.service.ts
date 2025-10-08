import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeployStage, DeployErrorReason } from '@prisma/client';

export interface DeployMetrics {
  kpis: {
    window: { from: Date; to: Date };
    createAttempts: number;
    createSuccess: number;
    createError: number;
    successRate: number;
    p50CreateMs?: number;
    p95CreateMs?: number;
    p99CreateMs?: number;
    meanCreateMs?: number;
    errorByReason: Record<string, number>;
  };
  series: Array<{
    day: Date;
    createAttempts: number;
    successRate: number;
    p95CreateMs?: number;
    errorByReason: Record<string, number>;
  }>;
}

@Injectable()
export class DeployAnalyticsService {
  private readonly logger = new Logger(DeployAnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async getDeployMetrics(
    projectId: string,
    from: Date,
    to: Date,
    bucket: 'day' = 'day'
  ): Promise<DeployMetrics> {
    // Get all deploy events in the time window
    const events = await this.prisma.deployEvent.findMany({
      where: {
        projectId,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group events by attemptId to analyze each deployment attempt
    const attempts = this.groupEventsByAttempt(events);
    
    // Calculate KPIs for the entire window
    const kpis = this.calculateKPIs(attempts);

    // Calculate time series data
    const series = this.calculateTimeSeries(attempts, from, to, bucket);

    return {
      kpis: {
        window: { from, to },
        ...kpis,
      },
      series,
    };
  }

  async aggregateDailyStats(projectId: string, day: Date): Promise<void> {
    const startOfDay = new Date(day);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(day);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Get all deploy events for the day
    const events = await this.prisma.deployEvent.findMany({
      where: {
        projectId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group events by attemptId
    const attempts = this.groupEventsByAttempt(events);
    
    // Calculate metrics
    const kpis = this.calculateKPIs(attempts);

    // Upsert daily stats
    await this.prisma.dailyDeployStat.upsert({
      where: {
        projectId_day: {
          projectId,
          day: startOfDay,
        },
      },
      update: {
        createAttempts: kpis.createAttempts,
        createSuccess: kpis.createSuccess,
        createError: kpis.createError,
        successRate: kpis.successRate,
        p50CreateMs: kpis.p50CreateMs,
        p95CreateMs: kpis.p95CreateMs,
        p99CreateMs: kpis.p99CreateMs,
        meanCreateMs: kpis.meanCreateMs,
        errorByReason: kpis.errorByReason,
      },
      create: {
        projectId,
        day: startOfDay,
        createAttempts: kpis.createAttempts,
        createSuccess: kpis.createSuccess,
        createError: kpis.createError,
        successRate: kpis.successRate,
        p50CreateMs: kpis.p50CreateMs,
        p95CreateMs: kpis.p95CreateMs,
        p99CreateMs: kpis.p99CreateMs,
        meanCreateMs: kpis.meanCreateMs,
        errorByReason: kpis.errorByReason,
      },
    });

    this.logger.log(`Aggregated daily stats for project ${projectId} on ${startOfDay.toISOString()}`);
  }

  async getWeeklyDigest(projectId: string): Promise<{
    successRate: number;
    attempts: number;
    p95CreateMs: number;
    p50CreateMs: number;
    topErrors: Array<{ reason: string; count: number }>;
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const events = await this.prisma.deployEvent.findMany({
      where: {
        projectId,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const attempts = this.groupEventsByAttempt(events);
    const kpis = this.calculateKPIs(attempts);

    const topErrors = Object.entries(kpis.errorByReason)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      successRate: kpis.successRate,
      attempts: kpis.createAttempts,
      p95CreateMs: kpis.p95CreateMs || 0,
      p50CreateMs: kpis.p50CreateMs || 0,
      topErrors,
    };
  }

  private groupEventsByAttempt(events: any[]): Map<string, any[]> {
    const attempts = new Map<string, any[]>();
    
    for (const event of events) {
      if (!attempts.has(event.attemptId)) {
        attempts.set(event.attemptId, []);
      }
      attempts.get(event.attemptId)!.push(event);
    }

    return attempts;
  }

  private calculateKPIs(attempts: Map<string, any[]>): {
    createAttempts: number;
    createSuccess: number;
    createError: number;
    successRate: number;
    p50CreateMs?: number;
    p95CreateMs?: number;
    p99CreateMs?: number;
    meanCreateMs?: number;
    errorByReason: Record<string, number>;
  } {
    let createAttempts = 0;
    let createSuccess = 0;
    let createError = 0;
    const durations: number[] = [];
    const errorByReason: Record<string, number> = {};

    for (const [attemptId, events] of attempts) {
      const createStarted = events.find(e => e.stage === DeployStage.CREATE_STARTED);
      const ready = events.find(e => e.stage === DeployStage.READY);
      const error = events.find(e => e.stage === DeployStage.ERROR);

      if (!createStarted) continue;

      createAttempts++;

      if (ready) {
        createSuccess++;
        if (ready.durationMs) {
          durations.push(ready.durationMs);
        }
      } else if (error) {
        createError++;
        const reason = error.errorReason || DeployErrorReason.UNKNOWN;
        errorByReason[reason] = (errorByReason[reason] || 0) + 1;
      }
    }

    const successRate = createAttempts > 0 ? createSuccess / createAttempts : 0;
    
    let p50CreateMs: number | undefined;
    let p95CreateMs: number | undefined;
    let p99CreateMs: number | undefined;
    let meanCreateMs: number | undefined;

    if (durations.length > 0) {
      const sortedDurations = [...durations].sort((a, b) => a - b);
      p50CreateMs = this.percentile(sortedDurations, 0.5);
      p95CreateMs = this.percentile(sortedDurations, 0.95);
      p99CreateMs = this.percentile(sortedDurations, 0.99);
      meanCreateMs = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }

    return {
      createAttempts,
      createSuccess,
      createError,
      successRate,
      p50CreateMs,
      p95CreateMs,
      p99CreateMs,
      meanCreateMs,
      errorByReason,
    };
  }

  private calculateTimeSeries(
    attempts: Map<string, any[]>,
    from: Date,
    to: Date,
    bucket: string
  ): Array<{
    day: Date;
    createAttempts: number;
    successRate: number;
    p95CreateMs?: number;
    errorByReason: Record<string, number>;
  }> {
    const series: Array<{
      day: Date;
      createAttempts: number;
      successRate: number;
      p95CreateMs?: number;
      errorByReason: Record<string, number>;
    }> = [];

    // Group attempts by day
    const dayGroups = new Map<string, any[]>();
    
    for (const [attemptId, events] of attempts) {
      const createStarted = events.find(e => e.stage === DeployStage.CREATE_STARTED);
      if (!createStarted) continue;

      const day = new Date(createStarted.createdAt);
      day.setUTCHours(0, 0, 0, 0);
      const dayKey = day.toISOString().split('T')[0];

      if (!dayGroups.has(dayKey)) {
        dayGroups.set(dayKey, []);
      }
      dayGroups.get(dayKey)!.push(events);
    }

    // Calculate metrics for each day
    for (const [dayKey, dayAttempts] of dayGroups) {
      const day = new Date(dayKey);
      const dayAttemptsMap = new Map();
      for (const events of dayAttempts) {
        const attemptId = events[0]?.attemptId;
        if (attemptId) {
          dayAttemptsMap.set(attemptId, events);
        }
      }

      const kpis = this.calculateKPIs(dayAttemptsMap);
      
      series.push({
        day,
        createAttempts: kpis.createAttempts,
        successRate: kpis.successRate,
        p95CreateMs: kpis.p95CreateMs,
        errorByReason: kpis.errorByReason,
      });
    }

    return series.sort((a, b) => a.day.getTime() - b.day.getTime());
  }

  private percentile(sortedArray: number[], p: number): number {
    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, index)];
  }
}
