import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // This route will redirect to GitHub
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const user = await this.authService.validateGithubUser(req.user);
    const token = await this.authService.generateJwtToken(user);
    
    // Set httpOnly cookie
    res.cookie('opshub_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    
    // Redirect to web app
    const webBaseUrl = process.env.WEB_BASE_URL || 'http://localhost:3000';
    res.redirect(`${webBaseUrl}/dashboard`);
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('opshub_token');
    res.json({ message: 'Logged out successfully' });
  }
}
