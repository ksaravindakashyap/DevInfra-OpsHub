import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../crypto/encryption.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '@prisma/client';

@Injectable()
export class EnvVarsService {
  private readonly logger = new Logger(EnvVarsService.name);

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private auditService: AuditService,
  ) {}

  async findByEnvironmentId(environmentId: string, userId: string) {
    // Verify user has access to the environment
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
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

    if (!environment) {
      throw new NotFoundException('Environment not found');
    }

    if (environment.project.org.members.length === 0) {
      throw new ForbiddenException('User not a member of this project\'s organization');
    }

    // Get latest version of each env var
    const envVars = await this.prisma.envVar.findMany({
      where: { environmentId },
      orderBy: [
        { key: 'asc' },
        { version: 'desc' },
      ],
    });

    // Group by key and get latest version
    const latestVars = new Map();
    for (const envVar of envVars) {
      if (!latestVars.has(envVar.key)) {
        latestVars.set(envVar.key, envVar);
      }
    }

    // Return masked values
    return Array.from(latestVars.values()).map(envVar => ({
      id: envVar.id,
      key: envVar.key,
      value: this.encryptionService.maskValue('decrypted_value_placeholder'),
      version: envVar.version,
      createdAt: envVar.createdAt,
      rotatedAt: envVar.rotatedAt,
      createdBy: envVar.createdBy,
    }));
  }

  async getVersions(environmentId: string, key: string, userId: string) {
    // Verify access
    await this.findByEnvironmentId(environmentId, userId);

    const versions = await this.prisma.envVar.findMany({
      where: { environmentId, key },
      orderBy: { version: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return versions.map(envVar => ({
      id: envVar.id,
      key: envVar.key,
      value: this.encryptionService.maskValue('decrypted_value_placeholder'),
      version: envVar.version,
      createdAt: envVar.createdAt,
      rotatedAt: envVar.rotatedAt,
      createdBy: envVar.createdBy,
    }));
  }

  async create(environmentId: string, key: string, value: string, userId: string, meta?: any) {
    // Validate key format
    if (!this.encryptionService.validateKey(key)) {
      throw new Error('Key must contain only uppercase letters, numbers, and underscores');
    }

    // Verify access and get user role
    const environment = await this.verifyAccess(environmentId, userId);

    // Check if key already exists
    const existing = await this.prisma.envVar.findFirst({
      where: { environmentId, key },
      orderBy: { version: 'desc' },
    });

    if (existing) {
      throw new Error('Environment variable already exists. Use update instead.');
    }

    // Encrypt the value
    const encrypted = this.encryptionService.encryptString(value);

    // Create new env var
    const envVar = await this.prisma.envVar.create({
      data: {
        environmentId,
        key,
        valueCiphertext: encrypted.ciphertext,
        valueIv: encrypted.iv,
        valueTag: encrypted.tag,
        version: 1,
        createdById: userId,
        meta,
      },
    });

    // Audit log
    await this.auditService.log({
      actorUserId: userId,
      projectId: environment.projectId,
      action: 'envvar.created',
      metadataJson: {
        key,
        version: 1,
        value: this.encryptionService.maskValue(value),
      },
    });

    return {
      id: envVar.id,
      key: envVar.key,
      value: this.encryptionService.maskValue(value),
      version: envVar.version,
      createdAt: envVar.createdAt,
    };
  }

  async update(environmentId: string, key: string, value: string, userId: string) {
    // Verify access
    const environment = await this.verifyAccess(environmentId, userId);

    // Get latest version
    const latest = await this.prisma.envVar.findFirst({
      where: { environmentId, key },
      orderBy: { version: 'desc' },
    });

    if (!latest) {
      throw new NotFoundException('Environment variable not found');
    }

    // Encrypt the new value
    const encrypted = this.encryptionService.encryptString(value);

    // Create new version
    const envVar = await this.prisma.envVar.create({
      data: {
        environmentId,
        key,
        valueCiphertext: encrypted.ciphertext,
        valueIv: encrypted.iv,
        valueTag: encrypted.tag,
        version: latest.version + 1,
        createdById: userId,
        rotatedAt: new Date(),
        meta: latest.meta,
      },
    });

    // Audit log
    await this.auditService.log({
      actorUserId: userId,
      projectId: environment.projectId,
      action: 'envvar.rotated',
      metadataJson: {
        key,
        oldVersion: latest.version,
        newVersion: envVar.version,
        value: this.encryptionService.maskValue(value),
      },
    });

    return {
      id: envVar.id,
      key: envVar.key,
      value: this.encryptionService.maskValue(value),
      version: envVar.version,
      createdAt: envVar.createdAt,
      rotatedAt: envVar.rotatedAt,
    };
  }

  async getDecryptedMap(environmentId: string): Promise<Record<string, string>> {
    // Get latest version of each env var
    const envVars = await this.prisma.envVar.findMany({
      where: { environmentId },
      orderBy: [
        { key: 'asc' },
        { version: 'desc' },
      ],
    });

    // Group by key and get latest version
    const latestVars = new Map();
    for (const envVar of envVars) {
      if (!latestVars.has(envVar.key)) {
        latestVars.set(envVar.key, envVar);
      }
    }

    // Decrypt and build map
    const result: Record<string, string> = {};
    for (const envVar of latestVars.values()) {
      try {
        const decrypted = this.encryptionService.decryptToString({
          iv: envVar.valueIv,
          ciphertext: envVar.valueCiphertext,
          tag: envVar.valueTag,
        });
        result[envVar.key] = decrypted;
      } catch (error) {
        this.logger.error(`Failed to decrypt env var ${envVar.key}`, error);
        // Skip this variable rather than failing the entire operation
      }
    }

    return result;
  }

  private async verifyAccess(environmentId: string, userId: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
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

    if (!environment) {
      throw new NotFoundException('Environment not found');
    }

    if (environment.project.org.members.length === 0) {
      throw new ForbiddenException('User not a member of this project\'s organization');
    }

    const membership = environment.project.org.members[0];
    if (membership.role === Role.VIEWER) {
      throw new ForbiddenException('Insufficient permissions to modify environment variables');
    }

    return environment;
  }
}
