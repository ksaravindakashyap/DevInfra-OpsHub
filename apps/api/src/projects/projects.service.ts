import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role, Provider } from '@prisma/client';
import { ConfigureProviderDto } from './dto/configure-provider.dto';
import { ConfigureSlackDto } from './dto/configure-slack.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(orgId: string, name: string, repoFullName: string, defaultBranch: string, userId: string) {
    // Verify user has access to the organization
    const membership = await this.prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('User not a member of this organization');
    }

    if (membership.role === Role.VIEWER) {
      throw new ForbiddenException('Insufficient permissions to create projects');
    }

    const project = await this.prisma.project.create({
      data: {
        orgId,
        name,
        repoFullName,
        defaultBranch,
      },
    });

    // Log the creation
    await this.auditService.log({
      actorUserId: userId,
      orgId,
      projectId: project.id,
      action: 'PROJECT_CREATED',
      metadataJson: { name, repoFullName, defaultBranch },
    });

    return project;
  }

  async findById(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
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

    // Check if user has access to the project through organization membership
    if (project.org.members.length === 0) {
      throw new ForbiddenException('User not a member of this project\'s organization');
    }

    return project;
  }

  async getDeployments(projectId: string, userId: string) {
    // Verify user has access to the project
    const project = await this.findById(projectId, userId);
    
    return this.prisma.previewDeployment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async configureProvider(projectId: string, config: ConfigureProviderDto, userId: string) {
    // Verify user has access to the project
    await this.findById(projectId, userId);

    const providerConfig = await this.prisma.providerConfig.upsert({
      where: { projectId },
      update: {
        provider: config.provider,
        vercelProjectId: config.vercelProjectId,
        vercelToken: config.vercelToken,
        netlifySiteId: config.netlifySiteId,
        netlifyToken: config.netlifyToken,
      },
      create: {
        projectId,
        provider: config.provider,
        vercelProjectId: config.vercelProjectId,
        vercelToken: config.vercelToken,
        netlifySiteId: config.netlifySiteId,
        netlifyToken: config.netlifyToken,
      },
    });

    // Log the configuration change
    await this.auditService.log({
      actorUserId: userId,
      projectId,
      action: 'project.provider.config.updated',
      metadataJson: {
        provider: config.provider,
        vercelProjectId: config.vercelProjectId,
        // Don't log tokens for security
      },
    });

    return providerConfig;
  }

  async configureSlack(projectId: string, config: ConfigureSlackDto, userId: string) {
    // Verify user has access to the project
    await this.findById(projectId, userId);

    const notificationChannel = await this.prisma.notificationChannel.upsert({
      where: {
        projectId_type: {
          projectId,
          type: 'SLACK',
        },
      },
      update: {
        slackBotToken: config.botToken,
        slackChannel: config.channel,
      },
      create: {
        projectId,
        type: 'SLACK',
        slackBotToken: config.botToken,
        slackChannel: config.channel,
      },
    });

    // Log the configuration change
    await this.auditService.log({
      actorUserId: userId,
      projectId,
      action: 'project.notifications.slack.updated',
      metadataJson: {
        channel: config.channel,
        // Don't log tokens for security
      },
    });

    return notificationChannel;
  }
}
