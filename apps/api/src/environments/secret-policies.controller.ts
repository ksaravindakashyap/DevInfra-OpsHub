import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SecretPoliciesService } from './secret-policies.service';
import { CreateSecretPolicyDto } from './dto/create-secret-policy.dto';

@Controller('projects/:projectId/secret-policies')
@UseGuards(JwtAuthGuard)
export class SecretPoliciesController {
  constructor(private secretPoliciesService: SecretPoliciesService) {}

  @Get()
  async getSecretPolicies(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    return this.secretPoliciesService.findByProjectId(projectId, user.userId);
  }

  @Post()
  async createSecretPolicy(
    @Param('projectId') projectId: string,
    @Body() createSecretPolicyDto: CreateSecretPolicyDto,
    @CurrentUser() user: any,
  ) {
    return this.secretPoliciesService.create(
      projectId,
      createSecretPolicyDto.keyPattern,
      createSecretPolicyDto.rotateEveryDays,
      user.userId,
    );
  }

  @Delete(':id')
  async deleteSecretPolicy(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.secretPoliciesService.delete(id, user.userId);
  }

  @Post('evaluate')
  async evaluatePolicies(
    @Param('projectId') projectId: string,
    @CurrentUser() user: any,
  ) {
    return this.secretPoliciesService.evaluatePolicies(projectId, user.userId);
  }
}
