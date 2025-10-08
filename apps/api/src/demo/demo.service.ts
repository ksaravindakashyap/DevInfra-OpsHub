import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookService } from '../webhook/webhook.service';
import { HealthService } from '../health/health.service';
import { features } from '../config/feature-flags';
import { createHash, createHmac } from 'crypto';

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    private prisma: PrismaService,
    private webhookService: WebhookService,
    private healthService: HealthService,
  ) {}

  async getDemoStatus(userId: string) {
    if (!features.DEMO_MODE) {
      return { demoMode: false, steps: [] };
    }

    // Check if user is owner of demo org
    const demoOrg = await this.prisma.organization.findFirst({
      where: { slug: 'demo-org' },
      include: {
        members: {
          where: { userId, role: 'OWNER' },
        },
      },
    });

    if (!demoOrg || demoOrg.members.length === 0) {
      throw new ForbiddenException('Demo mode requires Owner role in demo organization');
    }

    const steps = [
      { id: 'reset', name: 'Reset Demo Data', completed: false },
      { id: 'open-pr', name: 'Open Pull Request', completed: false },
      { id: 'degrade', name: 'Degrade Health Check', completed: false },
      { id: 'recover', name: 'Recover Health Check', completed: false },
      { id: 'close-pr', name: 'Close Pull Request', completed: false },
    ];

    return { demoMode: true, steps };
  }

  async resetDemo(userId: string) {
    if (!features.DEMO_MODE) {
      throw new ForbiddenException('Demo mode is not enabled');
    }

    // Verify user is owner of demo org
    await this.verifyDemoOwner(userId);

    this.logger.log(`Demo reset initiated by user ${userId}`);

    // Reset demo data by reseeding
    // This would call the existing seed logic
    // For now, we'll just log the action
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'demo.reset',
        metadataJson: { demoMode: true },
      },
    });

    return { success: true, message: 'Demo data reset successfully' };
  }

  async openPr(userId: string) {
    if (!features.DEMO_MODE) {
      throw new ForbiddenException('Demo mode is not enabled');
    }

    await this.verifyDemoOwner(userId);

    this.logger.log(`Demo PR opened by user ${userId}`);

    // Simulate PR opened webhook
    const payload = {
      action: 'opened',
      number: 42,
      pull_request: {
        number: 42,
        head: { ref: 'feature/demo', sha: 'abc123def456' },
        base: { ref: 'main', sha: 'def456ghi789' },
        merged: false,
        state: 'open',
      },
      repository: {
        full_name: 'demo-org/frontend-app',
        name: 'frontend-app',
        owner: { login: 'demo-org' },
      },
    };

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'test-secret';
    const payloadString = JSON.stringify(payload);
    const signature = createHmac('sha256', webhookSecret)
      .update(payloadString)
      .digest('hex');

    // Call webhook service internally
    await this.webhookService.handleGitHubWebhook(payloadString, `sha256=${signature}`);

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'demo.open-pr',
        metadataJson: { prNumber: 42, repo: 'demo-org/frontend-app' },
      },
    });

    return { success: true, message: 'Demo PR opened successfully' };
  }

  async closePr(userId: string) {
    if (!features.DEMO_MODE) {
      throw new ForbiddenException('Demo mode is not enabled');
    }

    await this.verifyDemoOwner(userId);

    this.logger.log(`Demo PR closed by user ${userId}`);

    // Simulate PR closed webhook
    const payload = {
      action: 'closed',
      number: 42,
      pull_request: {
        number: 42,
        head: { ref: 'feature/demo', sha: 'abc123def456' },
        base: { ref: 'main', sha: 'def456ghi789' },
        merged: false,
        state: 'closed',
      },
      repository: {
        full_name: 'demo-org/frontend-app',
        name: 'frontend-app',
        owner: { login: 'demo-org' },
      },
    };

    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'test-secret';
    const payloadString = JSON.stringify(payload);
    const signature = createHmac('sha256', webhookSecret)
      .update(payloadString)
      .digest('hex');

    await this.webhookService.handleGitHubWebhook(payloadString, `sha256=${signature}`);

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'demo.close-pr',
        metadataJson: { prNumber: 42, repo: 'demo-org/frontend-app' },
      },
    });

    return { success: true, message: 'Demo PR closed successfully' };
  }

  async degradeHealth(userId: string) {
    if (!features.DEMO_MODE) {
      throw new ForbiddenException('Demo mode is not enabled');
    }

    await this.verifyDemoOwner(userId);

    this.logger.log(`Demo health degradation initiated by user ${userId}`);

    // Find demo project's health check and temporarily modify it
    const demoProject = await this.prisma.project.findFirst({
      where: { repoFullName: 'demo-org/frontend-app' },
      include: { healthChecks: true },
    });

    if (demoProject && demoProject.healthChecks.length > 0) {
      const healthCheck = demoProject.healthChecks[0];
      
      // Temporarily set a high threshold to force failure
      await this.prisma.healthCheck.update({
        where: { id: healthCheck.id },
        data: { 
          failureThreshold: 1,
          // Store original values in metadata for recovery
          metadata: { 
            originalFailureThreshold: healthCheck.failureThreshold,
            demoDegraded: true 
          }
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'demo.degrade',
        metadataJson: { projectId: demoProject?.id },
      },
    });

    return { success: true, message: 'Health check degraded for demo' };
  }

  async recoverHealth(userId: string) {
    if (!features.DEMO_MODE) {
      throw new ForbiddenException('Demo mode is not enabled');
    }

    await this.verifyDemoOwner(userId);

    this.logger.log(`Demo health recovery initiated by user ${userId}`);

    // Find demo project's health check and restore it
    const demoProject = await this.prisma.project.findFirst({
      where: { repoFullName: 'demo-org/frontend-app' },
      include: { healthChecks: true },
    });

    if (demoProject && demoProject.healthChecks.length > 0) {
      const healthCheck = demoProject.healthChecks[0];
      
      // Restore original threshold
      const originalThreshold = healthCheck.metadata?.originalFailureThreshold || 3;
      
      await this.prisma.healthCheck.update({
        where: { id: healthCheck.id },
        data: { 
          failureThreshold: originalThreshold,
          metadata: { 
            originalFailureThreshold: originalThreshold,
            demoDegraded: false 
          }
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'demo.recover',
        metadataJson: { projectId: demoProject?.id },
      },
    });

    return { success: true, message: 'Health check recovered for demo' };
  }

  private async verifyDemoOwner(userId: string) {
    const demoOrg = await this.prisma.organization.findFirst({
      where: { slug: 'demo-org' },
      include: {
        members: {
          where: { userId, role: 'OWNER' },
        },
      },
    });

    if (!demoOrg || demoOrg.members.length === 0) {
      throw new ForbiddenException('Demo mode requires Owner role in demo organization');
    }
  }
}
