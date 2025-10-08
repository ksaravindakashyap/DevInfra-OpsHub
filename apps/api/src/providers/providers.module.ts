import { Module } from '@nestjs/common';
import { VercelProvider } from './vercel.provider';
import { MockProvider } from './mock.provider';
import { ProviderService } from './provider.service';

@Module({
  providers: [VercelProvider, MockProvider, ProviderService],
  exports: [ProviderService],
})
export class ProvidersModule {}
