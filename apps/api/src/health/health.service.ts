import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QueueService } from '../queue/queue.service';
import { Role, CheckStatus } from '@prisma/client';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private queueService: QueueService,
  ) {}

  async findByProjectId(projectId: string, userId: string) {
    // Verify user has access to the project
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        org: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
        healthChecks: {
          include: {
            environment: true,
            _count: {
              select: {
                samples: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.org.members.length === 0) {
      throw new ForbiddenException('User not a member of this project\'s organization');
    }

    // Calculate uptime for each check (last 24 hours)
    const checksWithUptime = await Promise.all(
      project.healthChecks.map(async (check) => {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const samples = await this.prisma.healthSample.findMany({
          where: {
            healthCheckId: check.id,
            createdAt: {
              gte: twentyFourHoursAgo,
            },
          },
        });

        const totalSamples = samples.length;
        const okSamples = samples.filter(s => s.ok).length;
        const uptime = totalSamples > 0 ? (okSamples / totalSamples) * 100 : 0;

        return {
          ...check,
          uptime: Math.round(uptime * 100) / 100, // Round to 2 decimal places
        };
      })
    );

    return checksWithUptime;
  }

  async findById(id: string, userId: string) {
    const healthCheck = await this.prisma.healthCheck.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            org: {
              include: {
                members: {
                  where: { userId },
                },
              },
            },
          },
        },
        environment: true,
      },
    });

    if (!healthCheck) {
      throw new NotFoundException('Health check not found');
    }

    if (healthCheck.project.org.members.length === 0) {
      throw new ForbiddenException('User not a member of this project\'s organization');
    }

    return healthCheck;
  }

  async create(projectId: string, data: any, userId: string) {
    // Verify access and get user role
    const project = await this.verifyAccess(projectId, userId);

    const healthCheck = await this.prisma.healthCheck.create({
      data: {
        projectId,
        environmentId: data.environmentId,
        name: data.name,
        url: data.url,
        method: data.method || 'GET',
        headersJson: data.headers || null,
        expectedMin: data.expectedMin || 200,
        expectedMax: data.expectedMax || 399,
        responseContains: data.responseContains || null,
        intervalSec: data.intervalSec || 60,
        timeoutMs: data.timeoutMs || 5000,
        failureThreshold: data.failureThreshold || 3,
        recoveryThreshold: data.recoveryThreshold || 2,
        alertCooldownMin: data.alertCooldownMin || 30,
        enabled: data.enabled !== false,
      },
    });

    // Register repeatable job if enabled
    if (healthCheck.enabled) {
      await this.queueService.enqueueHealthProbe({
        healthCheckId: healthCheck.id,
        projectId,
      });
    }

    // Audit log
    await this.auditService.log({
      actorUserId: userId,
      projectId,
      action: 'healthcheck.created',
      metadataJson: {
        name: healthCheck.name,
        url: healthCheck.url,
        intervalSec: healthCheck.intervalSec,
      },
    });

    return healthCheck;
  }

  async update(id: string, data: any, userId: string) {
    const healthCheck = await this.findById(id, userId);

    const updated = await this.prisma.healthCheck.update({
      where: { id },
      data: {
        name: data.name,
        url: data.url,
        method: data.method,
        headersJson: data.headers,
        expectedMin: data.expectedMin,
        expectedMax: data.expectedMax,
        responseContains: data.responseContains,
        intervalSec: data.intervalSec,
        timeoutMs: data.timeoutMs,
        failureThreshold: data.failureThreshold,
        recoveryThreshold: data.recoveryThreshold,
        alertCooldownMin: data.alertCooldownMin,
        enabled: data.enabled,
      },
    });

    // Re-register job if enabled, or remove if disabled
    if (updated.enabled) {
      await this.queueService.enqueueHealthProbe({
        healthCheckId: updated.id,
        projectId: updated.projectId,
      });
    } else {
      await this.queueService.removeHealthProbe(updated.id);
    }

    // Audit log
    await this.auditService.log({
      actorUserId: userId,
      projectId: healthCheck.projectId,
      action: 'healthcheck.updated',
      metadataJson: {
        name: updated.name,
        url: updated.url,
        enabled: updated.enabled,
      },
    });

    return updated;
  }

  async enable(id: string, userId: string) {
    const healthCheck = await this.findById(id, userId);

    const updated = await this.prisma.healthCheck.update({
      where: { id },
      data: { enabled: true },
    });

    // Register repeatable job
    await this.queueService.enqueueHealthProbe({
      healthCheckId: updated.id,
      projectId: updated.projectId,
    });

    // Audit log
    await this.auditService.log({
      actorUserId: userId,
      projectId: healthCheck.projectId,
      action: 'healthcheck.enabled',
      metadataJson: { name: updated.name },
    });

    return updated;
  }

  async disable(id: string, userId: string) {
    const healthCheck = await this.findById(id, userId);

    const updated = await this.prisma.healthCheck.update({
      where: { id },
      data: { enabled: false },
    });

    // Remove repeatable job
    await this.queueService.removeHealthProbe(updated.id);

    // Audit log
    await this.auditService.log({
      actorUserId: userId,
      projectId: healthCheck.projectId,
      action: 'healthcheck.disabled',
      metadataJson: { name: updated.name },
    });

    return updated;
  }

  async runNow(id: string, userId: string) {
    const healthCheck = await this.findById(id, userId);

    // Enqueue immediate probe
    await this.queueService.enqueueHealthProbe({
      healthCheckId: healthCheck.id,
      projectId: healthCheck.projectId,
      immediate: true,
    });

    // Audit log
    await this.auditService.log({
      actorUserId: userId,
      projectId: healthCheck.projectId,
      action: 'healthcheck.run_manual',
      metadataJson: { name: healthCheck.name },
    });

    return { success: true };
  }

  async getSamples(healthCheckId: string, from: Date, to: Date, userId: string) {
    const healthCheck = await this.findById(healthCheckId, userId);

    return this.prisma.healthSample.findMany({
      where: {
        healthCheckId,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createForPreview(projectId: string, prNumber: number, url: string) {
    // Find preview environment
    const previewEnv = await this.prisma.environment.findUnique({
      where: {
        projectId_type: {
          projectId,
          type: 'PREVIEW',
        },
      },
    });

    if (!previewEnv) {
      this.logger.warn(`No preview environment found for project ${projectId}`);
      return null;
    }

    const healthCheck = await this.prisma.healthCheck.create({
      data: {
        projectId,
        environmentId: previewEnv.id,
        name: `Preview PR #${prNumber}`,
        url,
        method: 'GET',
        intervalSec: 60,
        timeoutMs: 5000,
        failureThreshold: 3,
        recoveryThreshold: 2,
        alertCooldownMin: 30,
        enabled: true,
      },
    });

    // Register repeatable job
    await this.queueService.enqueueHealthProbe({
      healthCheckId: healthCheck.id,
      projectId,
    });

    // Audit log
    await this.auditService.log({
      actorUserId: 'system',
      projectId,
      action: 'healthcheck.created_auto',
      metadataJson: {
        name: healthCheck.name,
        url: healthCheck.url,
        prNumber,
      },
    });

    return healthCheck;
  }

  async disableForPreview(projectId: string, prNumber: number) {
    const healthCheck = await this.prisma.healthCheck.findFirst({
      where: {
        projectId,
        name: `Preview PR #${prNumber}`,
      },
    });

    if (!healthCheck) {
      return null;
    }

    const updated = await this.prisma.healthCheck.update({
      where: { id: healthCheck.id },
      data: { enabled: false },
    });

    // Remove repeatable job
    await this.queueService.removeHealthProbe(updated.id);

    // Create alert event
    await this.prisma.alertEvent.create({
      data: {
        healthCheckId: updated.id,
        type: 'DEGRADED',
        message: `Preview PR #${prNumber} removed`,
      },
    });

    // Audit log
    await this.auditService.log({
      actorUserId: 'system',
      projectId,
      action: 'healthcheck.disabled_auto',
      metadataJson: {
        name: updated.name,
        prNumber,
      },
    });

    return updated;
  }

  private async verifyAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        org: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.org.members.length === 0) {
      throw new ForbiddenException('User not a member of this project\'s organization');
    }

    const membership = project.org.members[0];
    if (membership.role === Role.VIEWER) {
      throw new ForbiddenException('Insufficient permissions to manage health checks');
    }

    return project;
  }
}
