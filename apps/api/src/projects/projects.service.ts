import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '@prisma/client';

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
}
