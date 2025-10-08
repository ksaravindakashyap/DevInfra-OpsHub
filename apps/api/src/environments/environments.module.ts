import { Module } from '@nestjs/common';
import { EnvironmentsService } from './environments.service';
import { EnvironmentsController } from './environments.controller';
import { EnvVarsService } from './env-vars.service';
import { EnvVarsController } from './env-vars.controller';
import { SecretPoliciesService } from './secret-policies.service';
import { SecretPoliciesController } from './secret-policies.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CryptoModule } from '../crypto/crypto.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, CryptoModule, AuditModule],
  providers: [
    EnvironmentsService,
    EnvVarsService,
    SecretPoliciesService,
  ],
  controllers: [
    EnvironmentsController,
    EnvVarsController,
    SecretPoliciesController,
  ],
  exports: [EnvironmentsService, EnvVarsService],
})
export class EnvironmentsModule {}
