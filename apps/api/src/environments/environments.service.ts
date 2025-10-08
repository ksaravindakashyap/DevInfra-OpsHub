import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnvironmentType } from '@prisma/client';

@Injectable()
export class EnvironmentsService {
  private readonly logger = new Logger(EnvironmentsService.name);

  constructor(private prisma: PrismaService) {}

  async findByProjectId(projectId: string) {
    return this.prisma.environment.findMany({
      where: { projectId },
      orderBy: { type: 'asc' },
    });
  }

  async findById(id: string) {
    return this.prisma.environment.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            org: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });
  }

  async createDefaultEnvironments(projectId: string) {
    const environments = [
      { type: EnvironmentType.PREVIEW, name: 'Preview' },
      { type: EnvironmentType.STAGING, name: 'Staging' },
      { type: EnvironmentType.PRODUCTION, name: 'Production' },
    ];

    const created = [];
    for (const env of environments) {
      try {
        const environment = await this.prisma.environment.upsert({
          where: {
            projectId_type: {
              projectId,
              type: env.type,
            },
          },
          update: {},
          create: {
            projectId,
            type: env.type,
            name: env.name,
          },
        });
        created.push(environment);
      } catch (error) {
        this.logger.warn(`Failed to create ${env.name} environment for project ${projectId}`, error);
      }
    }

    return created;
  }

  async getPreviewEnvironment(projectId: string) {
    return this.prisma.environment.findUnique({
      where: {
        projectId_type: {
          projectId,
          type: EnvironmentType.PREVIEW,
        },
      },
    });
  }
}
