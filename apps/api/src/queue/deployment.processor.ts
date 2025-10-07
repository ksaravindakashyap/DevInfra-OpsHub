import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderService } from '../providers/provider.service';
import { SlackService } from '../slack/slack.service';
import { AuditService } from '../audit/audit.service';
import { CreatePreviewJob, TearDownPreviewJob } from './queue.service';

@Processor('preview-queue')
@Injectable()
export class DeploymentProcessor extends WorkerHost {
  private readonly logger = new Logger(DeploymentProcessor.name);

  constructor(
    private prisma: PrismaService,
    private providerService: ProviderService,
    private slackService: SlackService,
    private auditService: AuditService,
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
      default:
        this.logger.warn(`Unknown job type: ${name}`);
    }
  }

  private async handleCreatePreview(data: CreatePreviewJob) {
    const { projectId, prNumber, branch } = data;

    try {
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

      // Update status to building
      await this.prisma.previewDeployment.update({
        where: { id: deployment.id },
        data: { status: 'BUILDING' },
      });

      // Create preview deployment
      const result = await this.providerService.createPreview({
        projectId,
        repoFullName: project.repoFullName,
        branch,
        provider: project.providerConfig.provider,
        config: project.providerConfig,
      });

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

    try {
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
}
