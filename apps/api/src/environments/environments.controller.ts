import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EnvironmentsService } from './environments.service';

@Controller('projects/:projectId/environments')
@UseGuards(JwtAuthGuard)
export class EnvironmentsController {
  constructor(private environmentsService: EnvironmentsService) {}

  @Get()
  async getEnvironments(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    return this.environmentsService.findByProjectId(projectId);
  }
}
