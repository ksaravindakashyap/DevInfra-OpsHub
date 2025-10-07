import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ConfigureProviderDto } from './dto/configure-provider.dto';
import { ConfigureSlackDto } from './dto/configure-slack.dto';
import { Role } from '@prisma/client';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get(':id')
  async getProject(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.findById(id, user.userId);
  }

  @Get(':id/deployments')
  async getDeployments(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.getDeployments(id, user.userId);
  }

  @Post(':id/provider')
  @UseGuards(RbacGuard)
  @Roles(Role.MAINTAINER, Role.OWNER)
  async configureProvider(
    @Param('id') id: string,
    @Body() configureProviderDto: ConfigureProviderDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.configureProvider(id, configureProviderDto, user.userId);
  }

  @Post(':id/slack')
  @UseGuards(RbacGuard)
  @Roles(Role.MAINTAINER, Role.OWNER)
  async configureSlack(
    @Param('id') id: string,
    @Body() configureSlackDto: ConfigureSlackDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.configureSlack(id, configureSlackDto, user.userId);
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
