import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.TEST_JWT_SECRET || process.env.JWT_SECRET,
    }),
  ],
  controllers: [TestController],
})
export class TestModule {}
