import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogData {
  actorUserId: string;
  orgId?: string;
  projectId?: string;
  action: string;
  metadataJson?: any;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId,
        orgId: data.orgId,
        projectId: data.projectId,
        action: data.action,
        metadataJson: data.metadataJson,
      },
    });
  }
}
