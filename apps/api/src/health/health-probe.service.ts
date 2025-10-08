import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SlackService } from '../slack/slack.service';
import { AuditService } from '../audit/audit.service';
import { CheckStatus, AlertType } from '@prisma/client';

export interface ProbeResult {
  ok: boolean;
  statusCode?: number;
  latencyMs?: number;
  error?: string;
}

@Injectable()
export class HealthProbeService {
  private readonly logger = new Logger(HealthProbeService.name);

  constructor(
    private prisma: PrismaService,
    private slackService: SlackService,
    private auditService: AuditService,
  ) {}

  async probeHealthCheck(healthCheckId: string): Promise<void> {
    const healthCheck = await this.prisma.healthCheck.findUnique({
      where: { id: healthCheckId },
      include: {
        project: {
          include: {
            org: true,
          },
        },
      },
    });

    if (!healthCheck || !healthCheck.enabled) {
      this.logger.debug(`Health check ${healthCheckId} not found or disabled`);
      return;
    }

    const startTime = Date.now();
    let result: ProbeResult;

    try {
      result = await this.performProbe(healthCheck);
    } catch (error) {
      this.logger.error(`Probe failed for health check ${healthCheckId}`, error);
      result = {
        ok: false,
        error: error.message,
      };
    }

    const latencyMs = Date.now() - startTime;

    // Record sample
    await this.prisma.healthSample.create({
      data: {
        healthCheckId,
        statusCode: result.statusCode,
        ok: result.ok,
        latencyMs: result.latencyMs || latencyMs,
        error: result.error,
      },
    });

    // Update health check with latest status
    await this.prisma.healthCheck.update({
      where: { id: healthCheckId },
      data: {
        lastStatus: result.ok ? CheckStatus.OK : CheckStatus.DEGRADED,
        lastLatencyMs: result.latencyMs || latencyMs,
        lastCheckedAt: new Date(),
      },
    });

    // Check for state transitions and send alerts
    await this.checkStateTransition(healthCheck, result);
  }

  private async performProbe(healthCheck: any): Promise<ProbeResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), healthCheck.timeoutMs);

      const headers: Record<string, string> = {
        'User-Agent': 'DevInfra-OpsHub-HealthCheck/1.0',
        ...(healthCheck.headersJson || {}),
      };

      const response = await fetch(healthCheck.url, {
        method: healthCheck.method,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      const statusCode = response.status;
      
      // Check status code range
      const statusOk = statusCode >= healthCheck.expectedMin && statusCode <= healthCheck.expectedMax;
      
      let bodyContains = true;
      if (healthCheck.responseContains && statusOk) {
        const body = await response.text();
        bodyContains = body.includes(healthCheck.responseContains);
      }

      const ok = statusOk && bodyContains;

      return {
        ok,
        statusCode,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        return {
          ok: false,
          error: 'Request timeout',
          latencyMs,
        };
      }

      return {
        ok: false,
        error: error.message,
        latencyMs,
      };
    }
  }

  private async checkStateTransition(healthCheck: any, result: ProbeResult): Promise<void> {
    const currentStatus = result.ok ? CheckStatus.OK : CheckStatus.DEGRADED;
    const previousStatus = healthCheck.lastStatus;

    // No state change
    if (previousStatus === currentStatus) {
      return;
    }

    // Check if we should send an alert based on consecutive samples
    const shouldAlert = await this.shouldSendAlert(healthCheck, currentStatus);
    
    if (!shouldAlert) {
      return;
    }

    // Create alert event
    const alertType = currentStatus === CheckStatus.OK ? AlertType.RECOVERED : AlertType.DEGRADED;
    const message = this.formatAlertMessage(healthCheck, currentStatus, result);

    await this.prisma.alertEvent.create({
      data: {
        healthCheckId: healthCheck.id,
        type: alertType,
        message,
      },
    });

    // Send Slack notification
    await this.slackService.notifyProject(healthCheck.projectId, {
      message,
      level: currentStatus === CheckStatus.OK ? 'success' : 'error',
    });

    this.logger.log(`Health check ${healthCheck.name} transitioned to ${currentStatus}`);
  }

  private async shouldSendAlert(healthCheck: any, newStatus: CheckStatus): Promise<boolean> {
    // Check cooldown
    const lastAlert = await this.prisma.alertEvent.findFirst({
      where: {
        healthCheckId: healthCheck.id,
        type: newStatus === CheckStatus.OK ? AlertType.RECOVERED : AlertType.DEGRADED,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lastAlert) {
      const cooldownMs = healthCheck.alertCooldownMin * 60 * 1000;
      const timeSinceLastAlert = Date.now() - lastAlert.createdAt.getTime();
      
      if (timeSinceLastAlert < cooldownMs) {
        this.logger.debug(`Alert suppressed due to cooldown for health check ${healthCheck.id}`);
        return false;
      }
    }

    // Check consecutive samples for threshold
    const threshold = newStatus === CheckStatus.OK 
      ? healthCheck.recoveryThreshold 
      : healthCheck.failureThreshold;

    const recentSamples = await this.prisma.healthSample.findMany({
      where: { healthCheckId: healthCheck.id },
      orderBy: { createdAt: 'desc' },
      take: threshold,
    });

    if (recentSamples.length < threshold) {
      return false;
    }

    // Check if all recent samples match the new status
    const allMatch = recentSamples.every(sample => 
      (newStatus === CheckStatus.OK && sample.ok) || 
      (newStatus === CheckStatus.DEGRADED && !sample.ok)
    );

    return allMatch;
  }

  private formatAlertMessage(healthCheck: any, status: CheckStatus, result: ProbeResult): string {
    const emoji = status === CheckStatus.OK ? ':white_check_mark:' : ':red_circle:';
    const statusText = status === CheckStatus.OK ? 'Recovered' : 'Health degraded';
    const latency = result.latencyMs ? `${result.latencyMs}ms` : 'N/A';
    
    if (status === CheckStatus.OK) {
      return `${emoji} ${statusText} — ${healthCheck.name} (${healthCheck.url}): latency ${latency}`;
    } else {
      const statusCode = result.statusCode ? `status ${result.statusCode}` : 'failed';
      const error = result.error ? `: ${result.error}` : '';
      return `${emoji} ${statusText} — ${healthCheck.name} (${healthCheck.url}): ${statusCode}, latency ${latency}${error}`;
    }
  }
}
