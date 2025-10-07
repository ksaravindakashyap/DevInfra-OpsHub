import { Injectable, Logger } from '@nestjs/common';
import { VercelProvider } from './vercel.provider';
import { PreviewProvider } from './provider.interface';
import { Provider, ProviderConfig } from '@prisma/client';

@Injectable()
export class ProviderService {
  private readonly logger = new Logger(ProviderService.name);

  constructor(private vercelProvider: VercelProvider) {}

  async createPreview(input: {
    projectId: string;
    repoFullName: string;
    branch: string;
    provider: Provider;
    config: ProviderConfig;
  }) {
    const { repoFullName, branch, provider, config } = input;

    const providerInstance = this.getProvider(provider);
    
    if (provider === Provider.VERCEL) {
      return providerInstance.createPreview({
        repoFullName,
        branch,
        vercelToken: config.vercelToken!,
        vercelProjectId: config.vercelProjectId!,
      });
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  async destroyPreview(input: {
    deploymentId: string;
    provider: Provider;
    config: ProviderConfig;
  }) {
    const { deploymentId, provider, config } = input;

    const providerInstance = this.getProvider(provider);
    
    if (provider === Provider.VERCEL) {
      return providerInstance.destroyPreview(deploymentId, config.vercelToken!);
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  private getProvider(provider: Provider): PreviewProvider {
    switch (provider) {
      case Provider.VERCEL:
        return this.vercelProvider;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
