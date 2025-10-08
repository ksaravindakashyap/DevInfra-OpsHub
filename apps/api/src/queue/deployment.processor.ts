import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderService } from '../providers/provider.service';
import { SlackService } from '../slack/slack.service';
import { AuditService } from '../audit/audit.service';
import { EnvVarsService } from '../environments/env-vars.service';
import { HealthProbeService } from '../health/health-probe.service';
import { HealthService } from '../health/health.service';
import { DeployEventsService } from '../analytics/deploy-events.service';
import { CreatePreviewJob, TearDownPreviewJob, HealthProbeJob } from './queue.service';

@Processor('preview-queue')
@Injectable()
export class DeploymentProcessor extends WorkerHost {
  private readonly logger = new Logger(DeploymentProcessor.name);

  constructor(
    private prisma: PrismaService,
    private providerService: ProviderService,
    private slackService: SlackService,
    private auditService: AuditService,
    private envVarsService: EnvVarsService,
    private healthProbeService: HealthProbeService,
    private healthService: HealthService,
    private deployEventsService: DeployEventsService,
  ) {
    super();
  }

  async process(job: Job) {
    const { name, data } = job;

    switch (name) {
      case 'create-preview':
        return this.handleCreatePreview(data as CreatePreviewJob);
      case 'tear-down-preview':
        return this.handleTearDownPreview(data as TearDownPreviewJob);
      case 'health-probe':
        return this.handleHealthProbe(data as HealthProbeJob);
      default:
        this.logger.warn(`Unknown job type: ${name}`);
    }
  }

  private async handleCreatePreview(data: CreatePreviewJob) {
    const { projectId, prNumber, branch } = data;
    const attemptId = this.deployEventsService.generateAttemptId();

    try {
      // Emit CREATE_REQUESTED event
      await this.deployEventsService.emitCreateRequested(
        projectId,
        prNumber,
        branch,
        'VERCEL', // Will be updated with actual provider
        attemptId
      );

      // Upsert preview deployment
      const deployment = await this.prisma.previewDeployment.upsert({
        where: {
          projectId_prNumber: {
            projectId,
            prNumber,
          },
        },
        update: {
          status: 'QUEUED',
          branch,
        },
        create: {
          projectId,
          prNumber,
          branch,
          status: 'QUEUED',
        },
      });

      // Load project and provider config
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: { providerConfig: true },
      });

      if (!project?.providerConfig) {
        await this.deployEventsService.emitError(
          projectId,
          prNumber,
          branch,
          'VERCEL',
          attemptId,
          { message: 'Missing provider configuration' }
        );

        await this.prisma.previewDeployment.update({
          where: { id: deployment.id },
          data: { status: 'ERROR' },
        });

        await this.slackService.notifyProject(projectId, {
          message: `❌ Preview deployment failed: Missing provider configuration`,
          level: 'error',
        });

        await this.auditService.log({
          actorUserId: 'system',
          projectId,
          action: 'deploy.preview.create.failed',
          metadataJson: { reason: 'Missing provider configuration' },
        });

        return;
      }

      // Emit CREATE_STARTED event
      await this.deployEventsService.emitCreateStarted(
        projectId,
        prNumber,
        branch,
        project.providerConfig.provider,
        attemptId
      );

      // Update status to building
      await this.prisma.previewDeployment.update({
        where: { id: deployment.id },
        data: { status: 'BUILDING' },
      });

      // Emit PROVIDER_BUILDING event
      await this.deployEventsService.emitProviderBuilding(
        projectId,
        prNumber,
        branch,
        project.providerConfig.provider,
        attemptId
      );

      // Get preview environment variables
      const previewEnvironment = await this.prisma.environment.findUnique({
        where: {
          projectId_type: {
            projectId,
            type: 'PREVIEW',
          },
        },
      });

      let envVars = {};
      if (previewEnvironment) {
        try {
          envVars = await this.envVarsService.getDecryptedMap(previewEnvironment.id);
        } catch (error) {
          this.logger.warn('Failed to load environment variables for preview', error);
        }
      }

      // Create preview deployment
      const startTime = Date.now();
      const result = await this.providerService.createPreview({
        projectId,
        repoFullName: project.repoFullName,
        branch,
        provider: project.providerConfig.provider,
        config: project.providerConfig,
        env: envVars,
      });
      const durationMs = Date.now() - startTime;

      // Update with results
      await this.prisma.previewDeployment.update({
        where: { id: deployment.id },
        data: {
          status: 'READY',
          providerDeploymentId: result.deploymentId,
          url: result.url,
          metadata: result.metadata,
        },
      });

      // Emit READY event with duration
      await this.deployEventsService.emitReady(
        projectId,
        prNumber,
        branch,
        project.providerConfig.provider,
        attemptId,
        durationMs,
        { url: result.url, deploymentId: result.deploymentId }
      );

      // Auto-create health check for preview
      if (result.url) {
        try {
          await this.healthService.createForPreview(projectId, prNumber, result.url);
        } catch (error) {
          this.logger.warn('Failed to create health check for preview', error);
        }
      }

      // Send success notification
      await this.slackService.notifyProject(projectId, {
        message: `✅ Preview ready: ${result.url}`,
        level: 'success',
      });

      await this.auditService.log({
        actorUserId: 'system',
        projectId,
        action: 'deploy.preview.create.succeeded',
        metadataJson: { url: result.url, deploymentId: result.deploymentId },
      });

    } catch (error) {
      this.logger.error('Failed to create preview deployment', error);

      // Emit ERROR event
      await this.deployEventsService.emitError(
        projectId,
        prNumber,
        branch,
        'VERCEL', // Will be updated with actual provider
        attemptId,
        error
      );

      await this.prisma.previewDeployment.update({
        where: {
          projectId_prNumber: {
            projectId,
            prNumber,
          },
        },
        data: { status: 'ERROR' },
      });

      await this.slackService.notifyProject(projectId, {
        message: `❌ Preview deployment failed: ${error.message}`,
        level: 'error',
      });

      await this.auditService.log({
        actorUserId: 'system',
        projectId,
        action: 'deploy.preview.create.failed',
        metadataJson: { error: error.message },
      });
    }
  }

  private async handleTearDownPreview(data: TearDownPreviewJob) {
    const { projectId, prNumber } = data;
    const attemptId = this.deployEventsService.generateAttemptId();

    try {
      // Emit TEARDOWN_REQUESTED event
      await this.deployEventsService.emitTeardownRequested(
        projectId,
        prNumber,
        'main', // Default branch
        'VERCEL', // Will be updated with actual provider
        attemptId
      );

      const deployment = await this.prisma.previewDeployment.findUnique({
        where: {
          projectId_prNumber: {
            projectId,
            prNumber,
          },
        },
        include: {
          project: {
            include: { providerConfig: true },
          },
        },
      });

      if (!deployment) {
        this.logger.warn(`No deployment found for PR ${prNumber} in project ${projectId}`);
        return;
      }

      // Destroy the deployment if it has a provider deployment ID
      if (deployment.providerDeploymentId && deployment.project.providerConfig) {
        await this.providerService.destroyPreview({
          deploymentId: deployment.providerDeploymentId,
          provider: deployment.project.providerConfig.provider,
          config: deployment.project.providerConfig,
        });
      }

      // Update status
      await this.prisma.previewDeployment.update({
        where: { id: deployment.id },
        data: {
          status: 'DESTROYED',
          destroyedAt: new Date(),
        },
      });

      // Disable health check for preview
      try {
        await this.healthService.disableForPreview(projectId, prNumber);
      } catch (error) {
        this.logger.warn('Failed to disable health check for preview', error);
      }

      // Emit TEARDOWN_DONE event
      await this.deployEventsService.emitTeardownDone(
        projectId,
        prNumber,
        deployment.branch,
        'VERCEL', // Will be updated with actual provider
        attemptId
      );

      // Send notification
      await this.slackService.notifyProject(projectId, {
        message: `🗑️ Preview destroyed for PR #${prNumber}`,
        level: 'info',
      });

      await this.auditService.log({
        actorUserId: 'system',
        projectId,
        action: 'deploy.preview.destroy.succeeded',
        metadataJson: { prNumber },
      });

    } catch (error) {
      this.logger.error('Failed to tear down preview deployment', error);

      await this.slackService.notifyProject(projectId, {
        message: `❌ Failed to destroy preview for PR #${prNumber}: ${error.message}`,
        level: 'error',
      });

      await this.auditService.log({
        actorUserId: 'system',
        projectId,
        action: 'deploy.preview.destroy.failed',
        metadataJson: { prNumber, error: error.message },
      });
    }
  }

  private async handleHealthProbe(data: HealthProbeJob) {
    const { healthCheckId } = data;

    try {
      await this.healthProbeService.probeHealthCheck(healthCheckId);
    } catch (error) {
      this.logger.error(`Health probe failed for ${healthCheckId}`, error);
    }
  }
}
