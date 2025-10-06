import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrgsService } from './orgs.service';
import { CreateOrgDto } from './dto/create-org.dto';

@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgsController {
  constructor(private orgsService: OrgsService) {}

  @Get()
  async getOrgs(@CurrentUser() user: any) {
    return this.orgsService.findByUserId(user.userId);
  }

  @Post()
  async createOrg(@Body() createOrgDto: CreateOrgDto, @CurrentUser() user: any) {
    return this.orgsService.create(createOrgDto.name, user.userId);
  }
}
