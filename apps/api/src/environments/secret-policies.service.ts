import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '@prisma/client';

@Injectable()
export class SecretPoliciesService {
  private readonly logger = new Logger(SecretPoliciesService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
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
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.org.members.length === 0) {
      throw new ForbiddenException('User not a member of this project\'s organization');
    }

    return this.prisma.secretPolicy.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(projectId: string, keyPattern: string, rotateEveryDays: number, userId: string) {
    // Verify access
    await this.verifyAccess(projectId, userId);

    const policy = await this.prisma.secretPolicy.create({
      data: {
        projectId,
        keyPattern,
        rotateEveryDays,
      },
    });

    // Audit log
    await this.auditService.log({
      actorUserId: userId,
      projectId,
      action: 'policy.created',
      metadataJson: {
        keyPattern,
        rotateEveryDays,
      },
    });

    return policy;
  }

  async delete(id: string, userId: string) {
    const policy = await this.prisma.secretPolicy.findUnique({
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
      },
    });

    if (!policy) {
      throw new NotFoundException('Secret policy not found');
    }

    if (policy.project.org.members.length === 0) {
      throw new ForbiddenException('User not a member of this project\'s organization');
    }

    const membership = policy.project.org.members[0];
    if (membership.role === Role.VIEWER) {
      throw new ForbiddenException('Insufficient permissions to delete secret policies');
    }

    await this.prisma.secretPolicy.delete({
      where: { id },
    });

    // Audit log
    await this.auditService.log({
      actorUserId: userId,
      projectId: policy.projectId,
      action: 'policy.deleted',
      metadataJson: {
        keyPattern: policy.keyPattern,
        rotateEveryDays: policy.rotateEveryDays,
      },
    });

    return { success: true };
  }

  async evaluatePolicies(projectId: string, userId: string) {
    // Verify access
    await this.verifyAccess(projectId, userId);

    const policies = await this.prisma.secretPolicy.findMany({
      where: { projectId },
    });

    if (policies.length === 0) {
      return { evaluated: 0, rotated: 0 };
    }

    let evaluated = 0;
    let rotated = 0;

    for (const policy of policies) {
      try {
        const result = await this.evaluatePolicy(policy.id, userId);
        evaluated += result.evaluated;
        rotated += result.rotated;
      } catch (error) {
        this.logger.error(`Failed to evaluate policy ${policy.id}`, error);
      }
    }

    // Update last evaluated time
    await this.prisma.secretPolicy.updateMany({
      where: { projectId },
      data: { lastEvaluatedAt: new Date() },
    });

    // Audit log
    await this.auditService.log({
      actorUserId: userId,
      projectId,
      action: 'policy.evaluate.succeeded',
      metadataJson: {
        evaluated,
        rotated,
      },
    });

    return { evaluated, rotated };
  }

  private async evaluatePolicy(policyId: string, userId: string) {
    const policy = await this.prisma.secretPolicy.findUnique({
      where: { id: policyId },
      include: {
        project: {
          include: {
            environments: {
              include: {
                vars: {
                  orderBy: [
                    { key: 'asc' },
                    { version: 'desc' },
                  ],
                },
              },
            },
          },
        },
      },
    });

    if (!policy) {
      return { evaluated: 0, rotated: 0 };
    }

    const keyPattern = new RegExp(policy.keyPattern);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.rotateEveryDays);

    let evaluated = 0;
    let rotated = 0;

    for (const environment of policy.project.environments) {
      // Group vars by key and get latest version
      const latestVars = new Map();
      for (const envVar of environment.vars) {
        if (!latestVars.has(envVar.key)) {
          latestVars.set(envVar.key, envVar);
        }
      }

      for (const envVar of latestVars.values()) {
        if (keyPattern.test(envVar.key)) {
          evaluated++;
          
          if (envVar.createdAt < cutoffDate) {
            // Mark for rotation (in a real implementation, you'd rotate the actual value)
            await this.prisma.envVar.update({
              where: { id: envVar.id },
              data: { rotatedAt: new Date() },
            });
            
            rotated++;
            
            // Audit log
            await this.auditService.log({
              actorUserId: userId,
              projectId: policy.projectId,
              action: 'envvar.rotated.policy',
              metadataJson: {
                key: envVar.key,
                version: envVar.version,
                policyId: policy.id,
              },
            });
          }
        }
      }
    }

    return { evaluated, rotated };
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
      throw new ForbiddenException('Insufficient permissions to manage secret policies');
    }

    return project;
  }
}
