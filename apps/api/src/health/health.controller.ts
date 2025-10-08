import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { HealthService } from './health.service';
import { CreateHealthCheckDto } from './dto/create-health-check.dto';
import { UpdateHealthCheckDto } from './dto/update-health-check.dto';

@Controller('projects/:projectId/health-checks')
@UseGuards(JwtAuthGuard)
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  async getHealthChecks(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    return this.healthService.findByProjectId(projectId, user.userId);
  }

  @Post()
  async createHealthCheck(
    @Param('projectId') projectId: string,
    @Body() createHealthCheckDto: CreateHealthCheckDto,
    @CurrentUser() user: any,
  ) {
    return this.healthService.create(projectId, createHealthCheckDto, user.userId);
  }

  @Patch(':id')
  async updateHealthCheck(
    @Param('id') id: string,
    @Body() updateHealthCheckDto: UpdateHealthCheckDto,
    @CurrentUser() user: any,
  ) {
    return this.healthService.update(id, updateHealthCheckDto, user.userId);
  }

  @Post(':id/enable')
  async enableHealthCheck(@Param('id') id: string, @CurrentUser() user: any) {
    return this.healthService.enable(id, user.userId);
  }

  @Post(':id/disable')
  async disableHealthCheck(@Param('id') id: string, @CurrentUser() user: any) {
    return this.healthService.disable(id, user.userId);
  }

  @Post(':id/run')
  async runHealthCheck(@Param('id') id: string, @CurrentUser() user: any) {
    return this.healthService.runNow(id, user.userId);
  }

  @Get(':id/samples')
  async getSamples(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: any,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return this.healthService.getSamples(id, fromDate, toDate, user.userId);
  }
}

@Controller('healthz')
export class HealthzController {
  @Get()
  async health() {
    return { ok: true };
  }
}