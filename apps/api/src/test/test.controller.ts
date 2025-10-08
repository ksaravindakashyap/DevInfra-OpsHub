import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

@Controller('test')
export class TestController {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  @Post('login-as')
  async loginAs(
    @Body() body: { email?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    // Only allow in test mode
    if (process.env.ALLOW_TEST_LOGIN !== '1' || process.env.NODE_ENV !== 'test') {
      throw new Error('Test login not allowed');
    }

    const email = body.email || 'test@demo.local';
    
    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create test user
      user = await this.prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
          githubId: `test-${Date.now()}`,
          avatarUrl: 'https://github.com/identicons/test.png',
        },
      });

      // Create demo org if it doesn't exist
      let demoOrg = await this.prisma.organization.findFirst({
        where: { name: 'Demo Org' },
      });

      if (!demoOrg) {
        demoOrg = await this.prisma.organization.create({
          data: {
            name: 'Demo Org',
            slug: 'demo-org',
            description: 'Demo organization for testing',
          },
        });
      }

      // Add user to org as owner
      await this.prisma.organizationMember.create({
        data: {
          organizationId: demoOrg.id,
          userId: user.id,
          role: Role.OWNER,
        },
      });
    }

    // Generate JWT token
    const token = this.jwtService.sign(
      { userId: user.id, email: user.email },
      { secret: process.env.TEST_JWT_SECRET || process.env.JWT_SECRET }
    );

    // Set httpOnly cookie
    res.cookie('opshub_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return { success: true, user: { id: user.id, email: user.email } };
  }
}
