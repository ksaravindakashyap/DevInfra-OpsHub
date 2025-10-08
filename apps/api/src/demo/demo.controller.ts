import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { DemoService } from './demo.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('demo')
@UseGuards(JwtAuthGuard)
export class DemoController {
  constructor(private demoService: DemoService) {}

  @Get('status')
  async getDemoStatus(@Request() req) {
    return this.demoService.getDemoStatus(req.user.id);
  }

  @Post('reset')
  async resetDemo(@Request() req) {
    return this.demoService.resetDemo(req.user.id);
  }

  @Post('open-pr')
  async openPr(@Request() req) {
    return this.demoService.openPr(req.user.id);
  }

  @Post('close-pr')
  async closePr(@Request() req) {
    return this.demoService.closePr(req.user.id);
  }

  @Post('degrade')
  async degradeHealth(@Request() req) {
    return this.demoService.degradeHealth(req.user.id);
  }

  @Post('recover')
  async recoverHealth(@Request() req) {
    return this.demoService.recoverHealth(req.user.id);
  }
}
