import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateGithubUser(profile: any) {
    const { id, emails, displayName, photos } = profile;
    
    const user = await this.prisma.user.upsert({
      where: { githubId: id.toString() },
      update: {
        email: emails?.[0]?.value,
        name: displayName,
        avatarUrl: photos?.[0]?.value,
      },
      create: {
        githubId: id.toString(),
        email: emails?.[0]?.value,
        name: displayName,
        avatarUrl: photos?.[0]?.value,
      },
    });

    return user;
  }

  async generateJwtToken(user: any) {
    const payload = { sub: user.id, email: user.email };
    return this.jwtService.sign(payload);
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }
}
