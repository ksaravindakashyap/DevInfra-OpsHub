import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get orgId from request params
    const orgId = request.params.orgId;
    if (!orgId) {
      throw new ForbiddenException('Organization ID required');
    }

    // Check user's role in the organization
    const membership = await this.prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: user.userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('User not a member of this organization');
    }

    // Check if user's role meets requirements
    const roleHierarchy = {
      [Role.VIEWER]: 1,
      [Role.DEVELOPER]: 2,
      [Role.MAINTAINER]: 3,
      [Role.OWNER]: 4,
    };

    const userRoleLevel = roleHierarchy[membership.role];
    const requiredRoleLevel = Math.min(...requiredRoles.map(role => roleHierarchy[role]));

    return userRoleLevel >= requiredRoleLevel;
  }
}
