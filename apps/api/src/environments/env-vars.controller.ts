import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EnvVarsService } from './env-vars.service';
import { CreateEnvVarDto } from './dto/create-env-var.dto';
import { UpdateEnvVarDto } from './dto/update-env-var.dto';

@Controller('environments/:environmentId/envvars')
@UseGuards(JwtAuthGuard)
export class EnvVarsController {
  constructor(private envVarsService: EnvVarsService) {}

  @Get()
  async getEnvVars(@Param('environmentId') environmentId: string, @CurrentUser() user: any) {
    return this.envVarsService.findByEnvironmentId(environmentId, user.userId);
  }

  @Get(':key/versions')
  async getVersions(
    @Param('environmentId') environmentId: string,
    @Param('key') key: string,
    @CurrentUser() user: any,
  ) {
    return this.envVarsService.getVersions(environmentId, key, user.userId);
  }

  @Post()
  async createEnvVar(
    @Param('environmentId') environmentId: string,
    @Body() createEnvVarDto: CreateEnvVarDto,
    @CurrentUser() user: any,
  ) {
    return this.envVarsService.create(
      environmentId,
      createEnvVarDto.key,
      createEnvVarDto.value,
      user.userId,
      createEnvVarDto.meta,
    );
  }

  @Put(':key')
  async updateEnvVar(
    @Param('environmentId') environmentId: string,
    @Param('key') key: string,
    @Body() updateEnvVarDto: UpdateEnvVarDto,
    @CurrentUser() user: any,
  ) {
    return this.envVarsService.update(
      environmentId,
      key,
      updateEnvVarDto.value,
      user.userId,
    );
  }
}
