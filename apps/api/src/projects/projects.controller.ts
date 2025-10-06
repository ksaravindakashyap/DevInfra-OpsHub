import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { Role } from '@prisma/client';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get(':id')
  async getProject(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.findById(id, user.userId);
  }
}

@Controller('orgs/:orgId/projects')
@UseGuards(JwtAuthGuard, RbacGuard)
export class OrgProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  @Roles(Role.MAINTAINER, Role.OWNER)
  async createProject(
    @Param('orgId') orgId: string,
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.create(
      orgId,
      createProjectDto.name,
      createProjectDto.repoFullName,
      createProjectDto.defaultBranch || 'main',
      user.userId,
    );
  }
}
