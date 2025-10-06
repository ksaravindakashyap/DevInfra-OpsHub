import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '@prisma/client';

@Injectable()
export class OrgsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(name: string, userId: string) {
    const slug = this.slugify(name);
    
    // Check if slug already exists
    const existing = await this.prisma.organization.findUnique({
      where: { slug },
    });
    
    if (existing) {
      throw new ConflictException('Organization with this name already exists');
    }

    const org = await this.prisma.organization.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId,
            role: Role.OWNER,
          },
        },
      },
    });

    // Log the creation
    await this.auditService.log({
      actorUserId: userId,
      orgId: org.id,
      action: 'ORG_CREATED',
      metadataJson: { name, slug },
    });

    return org;
  }

  async findByUserId(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        projects: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        projects: true,
      },
    });
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
